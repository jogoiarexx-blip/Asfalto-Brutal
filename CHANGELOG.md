## 2.1.1 — 31/10/2026 — Colisão no ramal e certificação incremental

- Corrigido bug reproduzido em Chromium: o choque da moto no ramal aplicava o limite da pista principal, projetando o veículo para fora da estrada alternativa.
- Deslocamento após contato (Enseada, Mirante, Cais): de 8,28/13,28/11,28 m para cerca de 0,85 m em cada ramal, todos abaixo do limite de 7,72 m.
- Teste de regressão WebGL para colisão nos 3 ramais da costa.
- Nove trajetos completos de 3.800 m (3 rotas × 3 ramais) dirigidos por simulação contínua em Node, sem teleporte, validando 27 checkpoints e zero impactos em barreiras.
- Entrega da missão 7 por direção contínua sem saltos; teste Chromium de recarga confirma 9 missões e créditos preservados após estado controlado.
- **Limites:** testes automatizados não equivalem a nove corridas humanas; não foram implementadas missões adicionais nem a malha urbana planejada.

## 2.1.0 — 30/10/2026 — Capítulo II: coleta, entrega e fuga por desvios

- Campanha evolui de 6 para 9 missões, preservando salvamento anterior.
- Entrega com pacote 3D na Enseada e destino na via principal, mediante passagem legítima sobre a estrada correta.
- Fuga pelo Cânion com perseguição obrigatória.
- Desafio de combate e múltiplas rotas na Serra.
- Terceiro ramal em cada bioma: 9 bifurcações dirigíveis no total.
- Indicadores de desvio cumprido, encomenda coletada e entrega confirmada no HUD.
- Bônus inéditos sem duplicação e testes determinísticos + browser integrado.

## 2.0.9 — 30/10/2026 — IA de rivais, trânsito e polícia usa bifurcações

- Seleção determinística de ramal no início da bifurcação; cada NPC segue seu caminho até a reconexão.
- Rivais e carros podem tomar os desvios nos três cenários.
- Polícia pode acompanhar o jogador em estrada alternativa, sem teleporte entre pistas separadas.
- Plano de ultrapassagem e distância ao jogador consideram a via física compartilhada.
- Correções na resolução de colisões entre veículos sobre ramais.
- Testes Node e integração WebGL adicionados; preservados modos, garagem, controle e campanha.

## 2.0.8 — 30/10/2026 — Bifurcações no mapa e pilotagem em rotas alternativas

- Seis ramais físicos reais, dois em cada um dos três cenários originais.
- Novo sistema de rotas e histerese em js/road-network.js.
- Física, yaw do piloto, câmera e recuperação após queda compatíveis com a via alternativa.
- Asfalto, faixas, guardrails e placas 3D dos caminhos laterais; distância de segurança para construções e árvores.
- Checkpoints não podem ser evitados pelos desvios; classificação respeita o próximo posto válido.
- Indicador de bifurcação no HUD e testes de navegação em Node/Chromium.
- Mantidos os sistemas anteriores de campanha, combate, polícia e garagem.

## 2.0.7 — 30/10/2026 — Cerco policial e correção de checkpoints

- A missão 4 exige uma fuga real registrada no contador (e integridade >=35%).
- A IA da polícia freia para cercar uma moto parada; detenção com barra e tempo de captura, com imunidade de recuperação.
- Resultado de prisão separado de queda ou chegada, sem premiação por fuga frustrada.
- Checkpoints perdidos corrigidos imediatamente após tolerância de 12 metros, sem retorno apenas na chegada.
- HUD de objetivos e checkpoints persistente no celular.
- Testes adicionais de regras, regressões e integração no Chromium com estado controlado.

## 2.0.6 — 30/10/2026 — Campanha original / Jailbreak capítulo I

- Seis missões sequenciais com critérios verificáveis e progresso salvo.
- Checkpoints com validação de passagem, portais 3D e retorno ao posto não validado.
- Desafio policial inicia perseguição real; HUD e resultado da missão integrados.
- Recompensa única, sem duplicação por repetição, preservando garagem.
- Loop de simulação com passo fixo de 60 Hz e limite de recuperação.
- Testes automatizados de campanha e checkpoints (Node.js).

# v2.0.5 — CORREÇÃO DEFINITIVA DA CAUSA DA MOTO INVISÍVEL

- Causa identificada com testes reais em Chromium WebGL: entrada undefined * escala -> rotação NaN em lean.rotation.x, invalidando matriz de todas malhas da moto do jogador.
- Getters de freio, aceleração e nitro sempre retornam booleanos; salvaguarda Number.isFinite na inclinação.
- Removidas cenas alternativas, canvas 2D e F10. Jogador, rivais e pista agora compartilham a mesma cena Three.js.
- Acrescentados testes automatizados para entrada sem controle, matriz 3D e prova de pixels no GPU Chromium.

## v2.0.4 — Resgate visual com evidência de GPU

- Captura de tela v2.0.3 comprovou que 77 draw calls não garantiam pixels coloridos da moto.
- Comparação de pixels antes e depois do segundo passe Three.js em área projetada da moto.
- Fallback visual 2D dinâmico (piloto, moto, inclinação e ataques) habilitado após duas verificações sem escrita de pixels.
- Comando F10 permite testar o fallback imediatamente, sem necessidade de recarregar.
- F9 atualizado com contagem de alterações de pixels, status e modo seguro.
- Sem alterações na física, controles, IA, garagem, armas, progressão ou oclusão dos rivais.
- Fallback é temporário: renderização 3D segue em atividade, e o overlay desliga após duas verificações positivas.
- Limitação: não foi possível executar WebGL interativo no ambiente de validação; a correção definitiva da saída de fragmentos dependerá de captura Spector.js.

## v2.0.3 — Correção estrutural da moto invisível + diagnóstico de WebGL

- **Desenho independente do protagonista**: cena e passagem WebGL exclusivamente para a moto do jogador. O cenário é renderizado primeiro; `clearDepth()` limpa somente o buffer de profundidade antes da segunda passagem, evitando que a pista e outros objetos ocultem a motocicleta.
- **Sombra preservada no asfalto**: o círculo de contato permanece na cena principal com um âncora que acompanha a posição/rotação da moto.
- **Iluminação do piloto sincronizada**: a cena do jogador recebe luz hemisférica e solar equivalentes às da pista; as configurações dinâmicas continuam afetando as cores dos materiais.
- **Diagnóstico F9 / `?debug=1`**: painel técnico exibe a ligação entre cenas, número de malhas visíveis, render calls, GPU/contexto WebGL, câmera e posição do jogador.
- **Menos regressões**: testes simulam a ordem das chamadas de renderização, a restauração de `autoClear` após falha e o vínculo entre sombra e modelo.
- Todos os sistemas de garagem, IA, armas, física, animações e gamepad foram preservados.

**Importante:** a reprodução visual WebGL ainda depende de validação no navegador do usuário; a passagem dupla corrige uma classe de falhas de oclusão/desenho e deixa diagnóstico técnico caso haja outro bloqueio (shader, GPU, câmera etc.).

## v2.0.2 — Compatibilidade de sombras com Three.js r186

- Substituído `THREE.PCFSoftShadowMap` (removido do WebGLRenderer) por `THREE.PCFShadowMap`.
- Preservados os perfis automáticos de sombra e os ajustes de desempenho.
- Mantidos os reparos de visibilidade da moto do jogador da v2.0.1.
- Incluído teste automatizado de compatibilidade do modo de sombra, prevenindo regressão.

## v2.0.1 — Correção de visibilidade da moto do jogador

- Garante que a geometria principal da moto e do piloto permanece visível (a sombra é um objeto separado).
- Evita que partes articuladas da moto do jogador desapareçam por culling incorreto.
- Câmera ganha correção de enquadramento quando o motociclista sai da área visível.
- Preserva ejeção durante quedas e restabelece visibilidade após recuperação.
- Testes automatizados de visibilidade, sombra, quedas e enquadramento.

## v2.0 — Câmera dinâmica e iluminação de cenário

- Três câmeras alternáveis: Clássica, Esportiva e Cinemática.
- Câmera acompanhando curvas com suavização independente de posição/olhar, sem acúmulo de roll.
- Melhor enquadramento de quedas e expansão de campo de visão ao usar nitro.
- Tecla C, R3 no gamepad e botão da interface para trocar câmera durante a corrida.
- Iluminação por rota: temperaturas de cor costeira, deserto e montanhas com mudanças discretas ao longo da pista.
- Modos de iluminação Dinâmica, Suave e Cinematográfica; reforço de luz somente em gráficos Alto e Ultra.
- Iluminação dinâmica sem pós-processamento nem sombras adicionais; preservados perfis leves e ajuste automático de FPS.
- Testes determinísticos novos para câmeras, interpolação, modos de iluminação e HTML.

## v1.9 — Visuais, modelos e desempenho (18/10/2026)

- Detalhes distintos para Falcão, Tempestade, Víbora e Bulldog, sem alterar a física da garagem.
- Tráfego com sedãs, vans, caminhonetes, peruas e esportivos preservando as hitboxes antigas.
- Construções, janelas, pórticos e túneis visuais nos três cenários; geometrias instanciadas e distantes da pista.
- Perfis gráficos Leve, Equilibrado, Alto e Ultra, com escolha Automática baseada em hardware e resolução.
- Sombras dinâmicas configuráveis, seletivas em veículos e desativadas automaticamente quando FPS cai em modo Automático.
- Testes extras dos perfis gráficos e posições dos cenários; preservados testes das versões anteriores.

## v1.8 — Personalidades, tráfego e tração dinâmica (18/10/2026)

- Estilos de pilotagem distintos: cauteloso, velocista, briguento, técnico, imprudente, estrategista.
- IA de automóveis avalia carros e motos à frente e atrás, escolhe faixa com segurança e reduz a velocidade.
- Solução de contato para pares carro/carro e carro/moto usando verificação contínua.
- Modelo determinístico de perda e recuperação de aderência, incluindo deslizamento residual.
- Sinalização e elementos de cenário otimizados com geometrias instanciadas em todos os mapas.
- Suíte `traffic-v18.test.mjs`, somada à regressão das versões anteriores.

## v1.7 — Derrapagem, disputas entre motos e polícia nas curvas

- Implementado `race-dynamics.js`: regras determinísticas de ultrapassagem, colisões entre os seis rivais, frenagem antecipada da polícia e cálculo de derrapagem.
- Ultrapassagens: rivais avaliam veículos mais lentos à frente, verificam se há espaço lateral e sustentam por um tempo a faixa escolhida para evitar movimento oscilante.
- Contatos rival × rival: colisão varrida por SAT, separação lateral ou longitudinal, conservação de posição relativa e redução de velocidade por impacto. Corrige atravessamentos entre motos da IA mesmo quando uma cruza a outra em um único quadro.
- Animação de ultrapassagem: o motociclista olha e inclina o corpo conforme o deslocamento real da faixa, com oscilação leve após o contato.
- Marcas duplas de pneu: `skid-marks.js` usa InstancedMesh circular com 80 (Leve) a 360 (Ultra) instâncias; reutiliza buffers, não cria meshes durante cada frenagem.
- Polícia: avalia a curva adiante, desacelera suavemente e intercepta a faixa do jogador sem sair da margem permitida.
- Regressões: novos testes para ultrapassagem, SAT de alta velocidade, colisão lateral, limites de perseguição, derrapagem e compatibilidade.

# Histórico de versões

## v1.6 — Pilotagem e defesa inteligente
- Aprimorada a física arcade de direção, aderência, inclinação e suspensão.
- Resolve colisões laterais e frontais com recuo, separação e transferência parcial de velocidade.
- IA reage à antecipação do ataque, podendo bloquear ou esquivar com cooldown.
- Capacete articulado, detalhes do equipamento e postura dinâmica de cabeça/pernas/tronco.
- Tremor controlado e breve efeito de câmera lenta nos impactos.
- Novos testes automatizados para contato, direção e reações.
- Mantidas cinco armas, polícia, garagem, perfis gráficos e controle USB/Bluetooth.

# Histórico de versões

## v1.5 — Combate animado, armas dos rivais e gamepad
- Corrigido erro de sintaxe herdado da v1.4 no arquivo principal do jogo.
- Substituída a animação da luta por swing com antecipação, extensão e recuperação.
- Adicionado deslocamento dos ombros, antebraços e rotação do tronco.
- Nova corrente de elos com simulação Verlet simplificada e LOD no modo Leve.
- Novas armas facão e cassetete, além das anteriores corrente, porrete e cano.
- Armas, dano, intervalo de golpes e hitboxes definidas em `js/combat.js`.
- Rivais armados de forma variada e polícia de moto com cassetete.
- Reação de câmera, faíscas, anel de impacto, som e vibração de gamepad quando suportada.
- Animações de queda e acompanhamento de câmera no acidente.
- Melhorado suporte a controle com seleção de pistas/armas nos menus, direcional e controles de corrida.
- Adicionado botão de troca de arma no celular, indicação de gamepad conectado e ajuda na interface.
- Acrescentados testes de 5 armas, áreas de golpe, animação, direção de braços e controle.
- Mantida estrutura do jogo sem alteração de chave da garagem, para preservar os créditos e motos anteriores.

## v1.4
- Armas básicas, gráficos procedurais da moto e braços articulados iniciais.

## v1.3
- Garagem, economia, motos policiais, IA agressiva e acidentes.

## v1.2
- Quedas, perseguições e otimizações.

## v1.1
- Hitboxes, comandos A/D, física e cenários.
