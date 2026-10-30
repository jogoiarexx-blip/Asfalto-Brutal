# ASFALTO BRUTAL — Execução do GDD Road Rash 3D + Jailbreak
Versão 2.0.9 · 30/10/2026

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

## Aplicado na 2.0.7
- [x] Prisão progressiva por policial que cerca a moto parada, com HUD, proteção pós-queda e derrota.
- [x] Corrigido o retorno ao checkpoint logo após ser perdido (tolerância de 12 m), sem retorno somente ao final.
- [x] Missão 4 agora exige fuga real registrada (1) e integridade mínima de 35%.
- [x] Status em tempo real dos objetivos e checkpoints acessível no mobile.
- [x] Testes de regressão determinísticos e integração Chromium com cenário controlado (não substitui partida completa).

## Aplicado na 2.0.8 — Rede viária incremental
- [x] Duas estradas opcionais por região, com conexão física à pista principal.
- [x] Troca de superfície pilotável por distância e histerese (não teleporte).
- [x] Modelo da pista validado independentemente dos gráficos, mantendo checkpoints nas junções finais.
- [x] Geometria e sinalização low-poly, segurança contra objetos nas pistas secundárias.
- [x] Câmera e recuperação após queda no ramal; HUD de rota escolhida.
- [x] Testes de navegação em física e navegador com estado controlado.
- [ ] Grafo viário urbano geral, IA circulando nos ramais, objetivos por escolha de caminho e certificação de corridas completas.

## Aplicado na 2.0.9 — IA nas bifurcações
- [x] Rivais usando ramais com uma decisão reproduzível por bifurcação.
- [x] Trânsito em pistas alternativas, incluindo respawn seguro no ramal.
- [x] Polícia seguindo o desvio do jogador quando consegue acessar a entrada.
- [x] Manobras e colisões calculadas em relação à via efetivamente utilizada.
- [x] Testes de rota e integração Chromium/WebGL com estados controlados.
- [ ] Missões exclusivas de cada ramal, rede urbana mais ampla e playtests integrais.

## Capítulo I — seis missões
| Missão | Local | Condição principal |
|---|---|---|
| 1 · A Primeira Marcha | Costa Fantasma | Pódio |
| 2 · Acerto de Contas | Costa Fantasma | Derrubar 1 rival e 5º ou melhor |
| 3 · Fio da Navalha | Serra da Fúria | Não cair, 5º ou melhor |
| 4 · Fora do Radar | Rota do Deserto | Despistar polícia 1 vez e terminar com 35% da integridade |
| 5 · Correio Urgente | Rota do Deserto | 4º ou melhor em 135 s |
| 6 · Dono da Pista | Serra da Fúria | Pódio, 2 rivais derrubados, no máximo 1 queda |

## Prioridades seguintes
1. Jogar e balancear todas as seis missões do início ao fim, sem teleporte ou cenários controlados nos testes; certificar que é possível concluir todas.
2. Expandir os ramais para uma malha de estradas interligadas, com escolhas táticas de navegação; adicionar checkpoints por segmento e classificação por distância válida efetivamente percorrida.
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
