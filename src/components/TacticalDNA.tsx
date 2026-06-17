import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface TacticalDNAProps {
    player: any;
    showLegend?: boolean;
    className?: string; // Para sobrescrever largura máxima ou margens
}

export function TacticalDNABar({ player, showLegend, className }: TacticalDNAProps) {
    if (!player) return null;
    
    // Calculamos o total específico dos 4 pilares para a proporção de 100%
    const off = player.totalOffense || 0;
    const def = player.totalDefense || 0;
    const sup = player.totalSupport || 0;
    const com = player.totalCombat || 0;
    const total = off + def + sup + com || 1;

    const items = [
        { label: 'Ataque', value: (off / total) * 100, color: 'bg-red-500', textColor: 'text-red-500' },
        { label: 'Defesa', value: (def / total) * 100, color: 'bg-blue-500', textColor: 'text-blue-500' },
        { label: 'Suporte', value: (sup / total) * 100, color: 'bg-green-500', textColor: 'text-green-500' },
        { label: 'Combate', value: (com / total) * 100, color: 'bg-amber-500', textColor: 'text-amber-500' },
    ].sort((a, b) => b.value - a.value); // Ordena do maior para o menor

    const barContent = (
        <div className={cn("flex h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-muted cursor-help border border-border/20 shadow-inner", className)}>
            {items.map((item, idx) => (
                <div 
                    key={idx}
                    className={cn(item.color, "h-full transition-all duration-500 ease-in-out")} 
                    style={{ width: `${item.value}%` }} 
                />
            ))}
        </div>
    );

    return (
        <div className="flex flex-col gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {barContent}
                    </TooltipTrigger>
                    <TooltipContent className="p-4 space-y-2 bg-popover/98 backdrop-blur-xl border-accent/20 shadow-2xl min-w-[180px]">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-accent mb-1 border-b border-border/50 pb-1">DNA ESTRATÉGICO</p>
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full shadow-sm", item.color)} /> 
                                        <span className="font-medium text-foreground/90">{item.label}</span>
                                    </div>
                                    <span className={cn("font-bold tabular-nums", item.textColor)}>
                                        {Math.round(item.value)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-1 mt-1 border-t border-border/30">
                            <p className="text-[9px] text-muted-foreground italic">Distribuição proporcional da pontuação</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {showLegend && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/30">
                            <div className={cn("w-2 h-2 rounded-full shadow-sm", item.color)} />
                            <span>{item.label}</span>
                            <span className="font-bold text-foreground tabular-nums">{Math.round(item.value)}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
