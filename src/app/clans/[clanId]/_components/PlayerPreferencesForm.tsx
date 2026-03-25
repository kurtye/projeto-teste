'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClanMember } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const HLL_ROLES = [
  'Comandante',
  'Oficial',
  'Fuzileiro',
  'Assalto',
  'Automático',
  'Médico',
  'Suporte',
  'Engenheiro',
  'Antitanque',
  'Metralhadora',
  'Atirador de Elite',
  'Spotter',
  'Tripulante de Tanque',
  'Comandante de Tanque',
];

const formSchema = z.object({
  playerName: z.string().min(1, {
    message: 'Por favor, selecione seu nome da lista.',
  }),
  primaryRole: z.string({
    required_error: 'Selecione sua classe principal.',
  }),
  secondaryRole1: z.string({
    required_error: 'Selecione sua primeira classe secundária.',
  }),
  secondaryRole2: z.string({
    required_error: 'Selecione sua segunda classe secundária.',
  }),
  roleToLearn: z.string({
    required_error: 'Selecione uma classe que gostaria de aprender.',
  }),
  playstyle: z.enum(['Ataque', 'Defesa', 'Ambos'], {
    required_error: 'Selecione seu estilo de preferência.',
  }),
  notes: z.string().optional(),
});

interface PlayerPreferencesFormProps {
  clanId: string;
  members: ClanMember[];
}

export function PlayerPreferencesForm({ clanId, members }: PlayerPreferencesFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMemberSearch, setOpenMemberSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerName: '',
      notes: '',
    },
  });

  const filteredMembers = useMemo(() => {
    return members.filter((member) =>
      member.playerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'clans', clanId, 'playerPreferences'), {
        ...values,
        updatedAt: serverTimestamp(),
      });
      
      form.reset();
      toast({
        title: 'Preferências salvas!',
        description: 'Suas preferências foram registradas com sucesso.',
      });
    } catch (error) {
      console.error('Error submitting preferences:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar suas preferências. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="playerName"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Selecione seu Nome</FormLabel>
              <Popover open={openMemberSearch} onOpenChange={setOpenMemberSearch}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? members.find((m) => m.playerName === field.value)?.playerName
                        : "Procurar seu nome..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                   <div className="flex items-center border-b px-3 py-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        placeholder="Filtrar por nome..."
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-64">
                      <div className="p-1">
                        {filteredMembers.length === 0 ? (
                          <div className="py-6 text-center text-sm">Nenhum membro encontrado.</div>
                        ) : (
                          filteredMembers.map((member) => (
                            <div
                              key={member.id}
                              className={cn(
                                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                field.value === member.playerName && "bg-accent text-accent-foreground"
                              )}
                              onClick={() => {
                                form.setValue("playerName", member.playerName);
                                setOpenMemberSearch(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === member.playerName ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {member.playerName}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Selecione seu nome da lista de membros do clã.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormLabel>Quais classes você prefere jogar?</FormLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="primaryRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground font-normal">Principal</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="1ª Opção" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HLL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondaryRole1"
              render={({ field }) => (
                <FormItem>
                   <FormLabel className="text-xs text-muted-foreground font-normal">Secundária 1</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="2ª Opção" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HLL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondaryRole2"
              render={({ field }) => (
                <FormItem>
                   <FormLabel className="text-xs text-muted-foreground font-normal">Secundária 2</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="3ª Opção" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HLL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="roleToLearn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qual classe gostaria de aprender?</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma classe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HLL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="playstyle"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Gosta de jogar no ataque ou defesa?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Ataque" />
                      </FormControl>
                      <FormLabel className="font-normal">Ataque</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Defesa" />
                      </FormControl>
                      <FormLabel className="font-normal">Defesa</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Ambos" />
                      </FormControl>
                      <FormLabel className="font-normal">Ambos / Conforme necessário</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações Adicionais</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Horários, experiência prévia, ou outras informações relevantes..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar Preferências'}
        </Button>
      </form>
    </Form>
  );
}
