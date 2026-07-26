ALTER TABLE "contact" ADD COLUMN "perfil_crudo" jsonb;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "analisis" jsonb;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "analisis_resumen" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "channel" text DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "follow_manual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "payload" jsonb;