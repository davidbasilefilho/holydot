import { Effect } from "effect";
import { parseConfig, type HolydotConfig } from "./config";

/**
 * Render reusable instructions and explicit role preferences, without host/account effects.
 *
 * @param base - UTF-8 reusable product instructions.
 * @param config - Saved local preferences, revalidated before interpolation.
 * @returns Complete Markdown with distinct coordinator/specialist choices.
 */
export function renderInstructions(base: string, config: HolydotConfig) {
  return Effect.gen(function* () {
    const parsed = yield* parseConfig(config);
    const { coordinator, specialist, speed } = parsed.delegation;
    return (
      `${base.trim()}\n\n## Preferências explícitas desta configuração\n\n` +
      `Esta seção substitui os padrões correspondentes. São preferências locais, sem conceder acesso ou aprovação.\n\n` +
      `- Coordenação de sessões delegadas: ${coordinator.model} / ${coordinator.effort}.\n` +
      `- Especialistas: ${specialist.model} / ${specialist.effort}.\n` +
      `- Velocidade: ${speed === "standard" ? "Standard" : "Fast (opt-in explícito)"}.\n` +
      `- Panorama: ${parsed.statusUpdates.intervalMinutes} minutos; não cria agendamento.\n` +
      `- CODEX_HOME: ${parsed.codexHome === null ? "respeitar valor explícito do ambiente ou padrão ~/.codex" : JSON.stringify(parsed.codexHome)}.\n\n` +
      "Aplique escolhas somente por controles reais e quando suportadas. Não altere o modelo principal do dot. " +
      "Se a integração futura com HolyCodex funcionar, prefira suas configurações como fonte de verdade, evitando seletores duplicados.\n"
    );
  });
}
