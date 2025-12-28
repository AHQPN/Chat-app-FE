import { cn, getInitials, generateAvatarColor, getAvatarUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Plus, LogOut, Settings, Loader2 } from 'lucide-react';
import type { Workspace, User } from '@/types';

interface WorkspaceSidebarProps {
    workspaces: Workspace[];
    selectedWorkspace: Workspace | null;
    onSelectWorkspace: (workspace: Workspace) => void;
    onLogout: () => void;
    user: User | null;
    isLoading: boolean;
}

export function WorkspaceSidebar({
    workspaces,
    selectedWorkspace,
    onSelectWorkspace,
    onLogout,
    user,
    isLoading,
}: WorkspaceSidebarProps) {
    return (
        <div className="w-[72px] min-w-[72px] h-full bg-slate-950/50 flex flex-col items-center py-3 border-r border-white/5">
            {/* Workspace List */}
            <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto px-3 scrollbar-thin scrollbar-thumb-white/10">
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                    </div>
                ) : workspaces.length === 0 ? (
                    <p className="text-white/40 text-xs text-center py-4">Chưa có workspace</p>
                ) : (
                    <TooltipProvider delayDuration={100}>
                        {workspaces.map((workspace) => (
                            <Tooltip key={workspace.id}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => onSelectWorkspace(workspace)}
                                        className={cn(
                                            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 overflow-hidden group relative',
                                            selectedWorkspace?.id === workspace.id
                                                ? 'rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30'
                                                : 'bg-white/10 hover:bg-white/20 hover:rounded-xl'
                                        )}
                                    >
                                        {/* Selection indicator */}
                                        <div
                                            className={cn(
                                                'absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200',
                                                selectedWorkspace?.id === workspace.id ? 'h-10' : 'h-0 group-hover:h-5'
                                            )}
                                            style={{ transform: 'translateX(-14px)' }}
                                        />
                                        <span className="text-white font-semibold text-lg">
                                            {getInitials(workspace.name)}
                                        </span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                                    {workspace.name}
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                )}

                {/* Add Workspace Button */}
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 hover:rounded-xl text-green-400 hover:text-green-300 transition-all duration-200"
                            >
                                <Plus className="w-6 h-6" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                            Tạo Workspace mới
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
                                    <AvatarImage src={getAvatarUrl(user?.avatar)} />
                                    <AvatarFallback className={cn('text-white font-semibold', generateAvatarColor(user?.fullName || 'U'))}>
                                        {getInitials(user?.fullName || 'User')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                            {user?.fullName || 'User'}
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
