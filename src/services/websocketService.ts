import { Client, type IMessage } from '@stomp/stompjs';
// import SockJS from 'sockjs-client'; // Disable SockJS to test Native WS

class WebSocketService {
    private client: Client;
    private subscriptions: Map<string, any> = new Map();

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
            // Resubscribe to all active topics
            this.subscriptions.forEach((callback, topic) => {
                this.client.subscribe(topic, (message: IMessage) => {
                    const body = JSON.parse(message.body);
                    callback(body);
                });
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

    subscribe(topic: string, callback: (message: any) => void) {
        // Store the callback
        this.subscriptions.set(topic, callback);

        // If already connected, subscribe immediately
        if (this.client.connected) {
            const sub = this.client.subscribe(topic, (message: IMessage) => {
                const body = JSON.parse(message.body);
                callback(body);
            });
            return sub;
        }
    }

    unsubscribe(topic: string) {
        this.subscriptions.delete(topic);
        // Note: Actual unsubscribe from STOMP is tricky if we don't store the StompSubscription object mapped to topic.
        // For simple usage where we resubscribe on reconnect, just removing from map prevents future callbacks.
        // Ideally we should keep track of StompSubscription objects.
    }

    sendMessage(conversationId: number, content: string, memberIds: number[] = []) {
        if (!this.client.connected) {
            console.error('WebSocket is not connected');
            return;
        }

        this.client.publish({
            destination: `/app/message.send/${conversationId}`,
            body: JSON.stringify({
                content,
                memberIds,
                urls: [], // Attachments logic to be added
            }),
        });
    }

    reaction(messageId: number, emoji: string) {
        if (!this.client.connected) return;
        this.client.publish({
            destination: `/app/msg/react/${messageId}`,
            body: JSON.stringify({ emoji }),
        });
    }

    unreaction(messageId: number, emoji: string) {
        if (!this.client.connected) return;
        this.client.publish({
            destination: `/app/msg/unreact/${messageId}`,
            body: JSON.stringify({ emoji }),
        });
    }
}

export const webSocketService = new WebSocketService();
