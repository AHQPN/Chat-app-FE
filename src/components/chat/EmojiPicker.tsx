import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmojiItem {
    filename: string;
    url: string;
}

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    emojis: EmojiItem[];
    disabled?: boolean;
    className?: string;
}

export function EmojiPicker({ onEmojiSelect, emojis, disabled, className }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);

    const handleSelect = (emoji: string) => {
        onEmojiSelect(emoji);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    className={cn("w-8 h-8 text-white/40 hover:text-white hover:bg-white/10", className)}
                >
                    <Smile className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-2 bg-slate-800 border-white/10 max-w-[280px]"
                side="top"
                align="center"
            >
                <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                    {emojis.length === 0 ? (
                        <span className="text-white/40 text-xs text-center p-2">Loading emojis...</span>
                    ) : (
                        emojis.map((item) => (
                            <button
                                key={item.filename}
                                onClick={() => handleSelect(item.filename)}
                                className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-white/10"
                                title={item.filename}
                            >
                                <img src={item.url} alt={item.filename} className="w-6 h-6 object-contain" />
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Inline reaction picker for messages
interface ReactionPickerProps {
    onReact: (emoji: string) => void;
    emojis: EmojiItem[];
    existingEmoji?: string; // Current user's emoji on this message
}

export function ReactionPicker({ onReact, emojis, existingEmoji }: ReactionPickerProps) {
    const [open, setOpen] = useState(false);

    const handleReact = (emoji: string) => {
        onReact(emoji);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-white/60 hover:text-white hover:bg-white/10"
                >
                    <Smile className="w-4 h-4 mr-1" />
                    <span className="text-xs">React</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-2 bg-slate-800 border-white/10 max-w-[280px]"
                side="top"
                align="start"
            >
                <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                    {emojis.length === 0 ? (
                        <span className="text-white/40 text-xs p-1">Loading...</span>
                    ) : (
                        emojis.slice(0, 24).map((item) => (
                            <button
                                key={item.filename}
                                onClick={() => handleReact(item.filename)}
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded transition-colors",
                                    existingEmoji === item.filename
                                        ? "bg-purple-500/30 ring-1 ring-purple-500"
                                        : "hover:bg-white/10"
                                )}
                                title={item.filename}
                            >
                                <img src={item.url} alt={item.filename} className="w-6 h-6 object-contain" />
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
