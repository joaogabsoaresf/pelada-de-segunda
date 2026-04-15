import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  type: z.enum(["monthly", "daily", "goalkeeper"]),
  defaultPot: z.number().int().min(-1).max(5).default(0),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  phone: z.string().min(10, "Telefone inválido").max(15).optional(),
  type: z.enum(["monthly", "daily", "goalkeeper"]).optional(),
  defaultPot: z.number().int().min(-1).max(5).optional(),
});

export const CreateMatchDaySchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().date()),
});

export const AddPlayerSchema = z.object({
  userId: z.string().min(1),
});

export const SetPotSchema = z.object({
  userId: z.string().min(1),
  pot: z.number().int().min(-1).max(10),
});

export const DrawTeamsSchema = z.object({
  numTeams: z.number().int().min(2).max(10),
});

export const UpdateTeamsSchema = z.object({
  teams: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      players: z.array(z.string()),
    })
  ),
});

export const CreateGameSchema = z.object({
  matchDayId: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
});

export const AddEventSchema = z.object({
  type: z.enum(["goal", "assist", "note"]),
  playerId: z.string().optional(),
  relatedPlayerId: z.string().optional(),
  note: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateMatchDayInput = z.infer<typeof CreateMatchDaySchema>;
export type AddPlayerInput = z.infer<typeof AddPlayerSchema>;
export type SetPotInput = z.infer<typeof SetPotSchema>;
export type DrawTeamsInput = z.infer<typeof DrawTeamsSchema>;
export type UpdateTeamsInput = z.infer<typeof UpdateTeamsSchema>;
export type CreateGameInput = z.infer<typeof CreateGameSchema>;
export type AddEventInput = z.infer<typeof AddEventSchema>;
