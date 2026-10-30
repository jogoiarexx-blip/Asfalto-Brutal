# ASFALTO BRUTAL — Execução do GDD Road Rash 3D + Jailbreak
Versão 2.0.6 · 30/10/2026

## Situação do projeto
O jogo preexistente v2.0.5 já possuía três estradas, seis rivais, onze carros, IA de tráfego, cinco armas, polícia, garagem, controles e quedas. A evolução preserva essa base em Three.js com HTML e módulos, sem impor migração para Vite.

## Aplicado na 2.0.6
- [x] Seleção entre Corrida Livre e Campanha com seis missões do Capítulo I.
- [x] Objetivos de missão por classificação, combate, sobrevivência, quedas, tempo e polícia ativa.
- [x] Missões sequenciais: progressão, salvamento local e bônus sem duplicação.
- [x] Checkpoints em 950, 1900 e 2850 metros, passagem obrigatória e portais 3D na pista.
- [x] HUD de objetivo, contador de checkpoints e tela de resultados detalhada.
- [x] Simulação em passo fixo de 60 Hz com limite de acumulação.
- [x] Testes determinísticos novos e preservação dos controles/armas anteriores.

## Capítulo I — seis missões
| Missão | Local | Condição principal |
|---|---|---|
| 1 · A Primeira Marcha | Costa Fantasma | Pódio |
| 2 · Acerto de Contas | Costa Fantasma | Derrubar 1 rival e 5º ou melhor |
| 3 · Fio da Navalha | Serra da Fúria | Não cair, 5º ou melhor |
| 4 · Fora do Radar | Rota do Deserto | Enfrentar polícia e terminar com 35% da integridade |
| 5 · Correio Urgente | Rota do Deserto | 4º ou melhor em 135 s |
| 6 · Dono da Pista | Serra da Fúria | Pódio, 2 rivais derrubados, no máximo 1 queda |

## Prioridades seguintes
1. Testar jogabilidade completa e balancear as seis missões em navegador, com testes reproduzíveis.
2. Grafo de estradas com bifurcações e checkpoints por segmento; classificação por distância válida no percurso.
3. Eventos narrativos e missões realmente específicas (resgate, entrega, escolta, fuga, líder rival).
4. Modo Patrulha policial, depois Sidecar cooperativo com controle independente.
5. Setorização, LOD e pré-carregamento de objetos sem apagar oponentes ativos.
6. Capítulos II e III: total planejado de 18 missões, ainda não implementados.
7. Avaliar Vite e pipeline de build sem comprometer publicação estática atual.

## Critérios de aceite
- Rodar npm test e checagem de sintaxe dos módulos.
- Confirmar moto e piloto visíveis em WebGL e manter direção correta.
- Verificar checkpoint perdido, travamento na chegada, pausa, prêmio não duplicado e progressão depois de recarregar.
- Validar realmente URL pública, controles e pelo menos uma corrida fim a fim antes de declarar certificação.

**Limite:** testes unitários não provam que toda a campanha é completável. Modos ainda não implementados devem permanecer fora do menu de jogo.
