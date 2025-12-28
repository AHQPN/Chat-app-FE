import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
// import SockJS from 'sockjs-client'; // Disable SockJS to test Native WS

interface ListenerInfo {
    callback: (message: any) => void;
}

interface SubscriptionInfo {
    listeners: Map<string, ListenerInfo>; // listenerId -> callback
    stompSubscription?: StompSubscription;
}

class WebSocketService {
    private client: Client;
    private subscriptions: Map<string, SubscriptionInfo> = new Map();

    constructor() {
        this.client = new Client({
            debug: (str) => {
                console.log('WS Debug:', str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });
    }

    private userNotificationCallback?: (packet: any) => void;

    setUserNotificationCallback(callback: (packet: any) => void) {
        this.userNotificationCallback = callback;
    }

    connect(token: string) {
        console.log('Initializing WebSocket Connection with Native WS to /ws...');

        this.client.webSocketFactory = () => {
            console.log('Creating new WebSocket instance...');
            // User requested usage of /ws endpoint directly.
            // Appending access_token to bypass potential 401 on handshake.
            return new WebSocket(`ws://localhost:8080/ws?access_token=${token}`);
        };

        this.client.connectHeaders = {
            Authorization: `Bearer ${token}`,
        };

        this.client.onConnect = () => {
            console.log('Connected to WebSocket');

            // 1. Always subscribe to User Notification Queue
            this.client.subscribe('/user/queue/notifications', (message: IMessage) => {
                console.log(`%c[WS-INCOMING] USER NOTIF`, 'color: #ff00ff; font-weight: bold;', message.body);
                if (this.userNotificationCallback) {
                    try {
                        this.userNotificationCallback(JSON.parse(message.body));
                    } catch (e) {
                        console.error('Error parsing notification:', e);
                    }
                }
            });

            // 2. Resubscribe to all active topics (Chat rooms, etc.)
            this.subscriptions.forEach((info, topic) => {
                const stompSub = this.client.subscribe(topic, (message: IMessage) => {
                    // Log incoming message for debugging
                    console.log(`%c[WS-INCOMING] Topic: ${topic}`, 'color: #00ff00; font-weight: bold;', message.body);

                    const body = JSON.parse(message.body);
                    // Call ALL listeners for this topic
                    info.listeners.forEach((listener) => {
                        listener.callback(body);
                    });
                });
                info.stompSubscription = stompSub;
            });
        };

        this.client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        this.client.activate();
    }

    disconnect() {
        this.client.deactivate();
        this.subscriptions.clear();
    }

    /**
     * Subscribe to a topic with a unique listener ID.
     * Multiple listeners can subscribe to the same topic.
     * @param topic - The STOMP topic to subscribe to
     * @param listenerId - Unique ID for this listener (e.g., 'chatpage', 'messageview')
     * @param callback - Callback function when message is received
     */
    subscribe(topic: string, listenerId: string, callback: (message: any) => void): void {
        let info = this.subscriptions.get(topic);

        if (!info) {
            // First subscription to this topic
            info = { listeners: new Map() };
            this.subscriptions.set(topic, info);

            // Subscribe to STOMP if connected
            if (this.client.connected) {
                const stompSub = this.client.subscribe(topic, (message: IMessage) => {
                    // Log incoming message for debugging
                    console.log(`%c[WS-INCOMING] Topic: ${topic}`, 'color: #00ff00; font-weight: bold;', message.body);

                    const body = JSON.parse(message.body);
                    // Call ALL listeners for this topic
                    info!.listeners.forEach((listener) => {
                        listener.callback(body);
                    });
                });
                info.stompSubscription = stompSub;
            }
        }

        // Add or update listener
        console.log(`[WS] Subscribe: topic=${topic}, listenerId=${listenerId}`);
        info.listeners.set(listenerId, { callback });
    }

    /**
     * Unsubscribe a specific listener from a topic.
     * Only unsubscribes from STOMP when no listeners remain.
     * @param topic - The STOMP topic
     * @param listenerId - The listener ID to remove
     */
    unsubscribe(topic: string, listenerId: string) {
        const info = this.subscriptions.get(topic);
        if (!info) return;

        console.log(`[WS] Unsubscribe: topic=${topic}, listenerId=${listenerId}`);
        info.listeners.delete(listenerId);

        // If no more listeners, unsubscribe from STOMP
        if (info.listeners.size === 0) {
            if (info.stompSubscription) {
                console.log('[WS] No more listeners, unsubscribing from STOMP:', topic);
                info.stompSubscription.unsubscribe();
            }
            this.subscriptions.delete(topic);
        }
    }

    sendMessage(conversationId: number, content: string, memberIds: number[] = [], parentMessageId?: number, urls: number[] = [], threadId?: number) {
        if (!this.client.connected) {
            console.error('WebSocket is not connected');
            return;
        }

        this.client.publish({
            destination: `/app/message.send/${conversationId}`,
            body: JSON.stringify({
                content,
                memberIds,
                urls,
                parentMessageId,
                threadId
            }),
        });
    }

    reaction(messageId: number, emoji: string) {
        if (!this.client.connected) return;
        this.client.publish({
            destination: '/app/msg/react',
            body: JSON.stringify({ messageId, emoji }),
        });
    }

    // Unreact - removes current user's reaction from message
    unreaction(messageId: number) {
        if (!this.client.connected) return;
        this.client.publish({
            destination: '/app/msg/unreact',
            body: JSON.stringify({ messageId }),
        });
    }

    pinMessage(messageId: number) {
        if (!this.client.connected) return;
        this.client.publish({
            destination: '/app/msg/pin',
            body: JSON.stringify({ messageId }),
        });
    }

    unpinMessage(messageId: number) {
        if (!this.client.connected) return;
        this.client.publish({
            destination: '/app/msg/unpin',
            body: JSON.stringify({ messageId }),
        });
    }

    sendTyping(conversationId: number, isTyping: boolean) {
        if (!this.client.connected) return;
        this.client.publish({
            destination: '/app/conversation/typing',
            body: JSON.stringify({ conversationId, isTyping }),
        });
    }
}

export const webSocketService = new WebSocketService();
