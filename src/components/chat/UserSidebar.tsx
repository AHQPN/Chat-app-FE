import { cn, getInitials, generateAvatarColor } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { LogOut, Settings, MessageSquare, Bell } from 'lucide-react';
import type { User } from '@/types';

interface UserSidebarProps {
    user: User | null;
    onLogout: () => void;
}

export function UserSidebar({ user, onLogout }: UserSidebarProps) {
    return (
        <div className="w-[72px] min-w-[72px] h-full bg-slate-950/50 flex flex-col items-center py-3 border-r border-white/5">
            {/* App Logo */}
            <div className="mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <MessageSquare className="w-6 h-6 text-white" />
                </div>
            </div>

            <Separator className="my-2 bg-white/10 w-8" />

            {/* Quick Actions */}
            <div className="flex-1 w-full flex flex-col items-center gap-2 px-3">
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 hover:rounded-xl text-white/60 hover:text-white transition-all duration-200 relative"
                            >
                                <Bell className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                            Thông báo
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <Separator className="my-2 bg-white/10 w-8" />

            {/* User Actions */}
            <div className="flex flex-col items-center gap-2 px-3">
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 hover:rounded-xl text-white/60 hover:text-white transition-all duration-200"
                            >
                                <Settings className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                            Cài đặt
                        </TooltipContent>
                    </Tooltip>

                    {/* User Avatar */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="relative group">
                                <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-purple-500/50 transition-all duration-200">
                                    <AvatarImage src={user?.avatar} />
                                    <AvatarFallback className={cn('text-white font-semibold', generateAvatarColor(user?.fullName || 'U'))}>
                                        {getInitials(user?.fullName || 'User')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                            <div>
                                <p className="font-semibold">{user?.fullName || 'User'}</p>
                                <p className="text-xs text-white/60">{user?.email || 'Online'}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onLogout}
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:rounded-xl text-white/60 hover:text-red-400 transition-all duration-200"
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                            Đăng xuất
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
