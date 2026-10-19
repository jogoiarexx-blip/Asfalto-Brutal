# ASFALTO BRUTAL v2.0.4 — Tráfego, IA e aderência

Continuação direta da v1.7. Mantidos armas corpo a corpo, polícia, garagem, acidentes, teclado, controles USB/Bluetooth, touchscreen e formato web com GitHub Pages.

## Hotfix de sombras v2.0.2

- Compatível com Three.js 0.186.1: usa `PCFShadowMap` em lugar de `PCFSoftShadowMap` removido.
- A mensagem no console era um aviso de compatibilidade, não um erro fatal.
- Correção de visibilidade da moto da versão 2.0.1 preservada.

## Novidades verificadas

- **Seis estilos de rivais**: cauteloso, velocista, briguento, técnico, imprudente e estrategista, com diferenças reais em aceleração de recuperação, velocidade-alvo, troca de faixa e frequência de golpes.
- **Tráfego reativo**: automóveis procuram faixas livres, freiam se não podem ultrapassar e trocam de faixa progressivamente, sem teleporte. Também consideram motos rápidas se aproximando por trás.
- **Contato NPC misto**: detecção contínua e separação entre carros e motos adversárias e entre carros, sem afetar a rotina de contato do jogador.
- **Aderência dinâmica**: frenagem em alta velocidade durante curvas reduz tração, provoca deslocamento lateral residual e recuperação gradual. As marcas de pneus da v1.7 continuam sendo exibidas.
- **Cenários**: nova sinalização/luminárias decorativas, rochas na serra e no deserto e espuma do mar na costa, usando InstancedMesh e quantidades menores na configuração LEVE.
- **Qualidade**: nova suíte de testes cobrindo tráfego, ultrapassagens seguras, aderência e contatos entre veículos.

## Limitações

A física permanece arcade simplificada: não simula pneus ou suspensão com corpos rígidos 3D. A biblioteca Three.js é carregada por CDN; a primeira execução requer internet. O jogo abre no navegador via `INICIAR-JOGO.bat` (não é um EXE nativo).

## Controles

W/↑ acelerar, A/D ou ←/→ virar, Espaço/S frear, Shift nitro, J/K atacar, 1–5 trocar arma, P/Esc pausar, H mostrar hitboxes. Compatível com gamepad nos comandos da v1.7.

## Testes

No projeto de código-fonte: `npm test` (Node.js necessário apenas para executar os testes). O BAT da versão de jogar utiliza somente PowerShell nativo do Windows.

---

## Histórico anterior (v1.7)

# ASFALTO BRUTAL v1.7 — Derrapagem e ultrapassagens

A v1.7 continua diretamente sobre a v1.6, preservando motos, cinco armas, garagem, polícia, hitboxes, controles e publicação em GitHub Pages.

## Destaques da v1.7

- **IA de ultrapassagem:** o rival avalia o espaço na pista, escolhe uma faixa lateral e mantém sua decisão brevemente. A postura do piloto acompanha o deslocamento.
- **Colisões entre rivais:** detecção contínua (swept SAT), separação de motos e redução de velocidade em impactos; menos atravessamentos durante as disputas.
- **Derrapagem visual:** marcas dos dois pneus no asfalto ao frear e inclinar em velocidade, com buffer circular reaproveitado para rodar em hardware modesto.
- **Polícia em curvas:** previsão de curva adiante, desaceleração progressiva e reposicionamento limitado à pista.
- **Testes:** `tests/race-dynamics.test.mjs`, incluindo correção de atravessamento em um quadro e conservação de controles.

A v1.7 mantém o Three.js via CDN, portanto a primeira execução requer internet. Os desenhos e colisões são aproximações arcade; não há simulação integral de suspensão ou corpos rígidos.

# ASFALTO BRUTAL v1.6 — Pilotagem, colisões e defesa inteligente

Jogo original inspirado em corridas arcade dos anos 90. Sem ROMs ou assets proprietários de Road Rash. Evolução incremental da v1.5, mantendo pistas, garagem, progressão, polícia e controles corrigidos.

## Novidades da v1.6

- **Pilotagem mais consistente:** suavização de direção, perda moderada de esterço em alta velocidade, aderência na terra, suspensão, inclinação e resposta à frenagem. A/D permanecem no sentido correto da tela.
- **Colisões com impulso:** detecção contínua preservada, agora com resolução de contato dianteiro/lateral, ricochete leve, redução de velocidade proporcional ao choque e balanço da moto.
- **IA defensiva:** adversários agressivos reconhecem a preparação do golpe e podem defender com os braços ou deslocar gradualmente a moto para longe do ataque. Inclui tempo de reação e cooldown, evitando invulnerabilidade permanente.
- **Piloto mais detalhado:** capacete com pivô de cabeça, peças no traje, joelheiras, postura do tronco e pernas independentes nas curvas, golpes e bloqueios.
- **Câmera e choques:** acompanhamento lateral, pequenas oscilações de suspensão e breve desaceleração cinematográfica nos impactos.
- **Testes de regressão:** módulos puros `js/defense.js`, `js/contact-response.js` e `tests/handling-defense.test.mjs` para verificar reação dos rivais e comportamento de colisões.

## Novidades da v1.5

- Animação de braços com antecipação, extensão, recuperação, rotação do tronco e reação ao golpe. A direção do braço acompanha corretamente o lado da tela.
- 5 armas: **corrente, porrete, cano, facão e cassetete**; alcance, intervalo entre ataques e dano próprios.
- Corrente com **simulação visual Verlet simplificada** (elos articulados, gravidade, inércia, restrição de comprimento); versão Leve usa menos elos. A colisão do golpe ainda usa a hitbox arcade em vez de colisão individual de cada elo.
- Rivais com armas diferentes; policiais motociclistas equipados com cassetete.
- Anéis de impacto, faíscas, reforço de áudio, vibração em controles compatíveis e sacudida da câmera.
- Tombos com ejeção do piloto, rotação e câmera de acidente, seguidos de recuperação protegida.
- Suporte a controle padrão via Gamepad API inclusive no menu, além de mouse, teclado e comandos touchscreen.
- Pequenos retoques nos modelos de motos (painéis e acabamentos extras).

## Rodar no Windows

Extraia o ZIP inteiro e clique em `INICIAR-JOGO.bat`. O arquivo inicia um servidor local e abre seu navegador. É um jogo web, não um executável nativo. O computador precisa de navegador com WebGL e conexão com a internet para carregar o Three.js pelo CDN. Alternativamente use `python -m http.server 8000` a partir da pasta do jogo, acessando http://localhost:8000.

Para publicar no GitHub Pages, envie o conteúdo desta pasta na raiz do repositório; o arquivo inicial é `index.html`.

## Teclado

| Tecla | Ação |
|---|---|
| W ou ↑ | Acelerar |
| Espaço, S ou ↓ | Frear |
| A/D ou ←/→ | Esquerda/direita na tela |
| J/K | Golpe para esquerda/direita |
| 1/2/3/4/5 | Corrente/porrete/cano/facão/cassetete |
| Q/E | Arma anterior/próxima |
| Shift | Nitro |
| P/Esc | Pausar |
| H | Mostrar hitboxes |

## Controle USB/Bluetooth (mapeamento padrão Xbox / Gamepad API)

| Botão | Durante a corrida |
|---|---|
| Analógico esquerdo | Direção |
| RT (R2) ou A | Acelerar |
| LT (L2) | Frear |
| X (quadrado) ou LB (L1) | Golpe para esquerda da tela |
| B (círculo) ou RB (R1) | Golpe para direita da tela |
| Y (triângulo) | Nitro |
| Direcional ↑/← | Arma anterior |
| Direcional ↓/→ | Próxima arma |
| Start/Options | Pausar/continuar |

**Nos menus:** direcional esquerda/direita seleciona a pista, cima/baixo seleciona a arma; A ou Start inicia/reinicia ou continua; B volta ao menu nas telas de pausa e resultado.

A Gamepad API do navegador requer que o controle seja conectado e um botão seja pressionado. Alguns controles genéricos têm mapeamento diferente; vibração é opcional e depende do navegador/hardware.

## Estrutura

- `js/combat.js`: regras de armas e combate arcade, testáveis sem Three.js.
- `js/rider-animation.js`: animação dos braços e do corpo.
- `js/vehicles.js`: modelos procedurais, rig e corrente de elos.
- `js/crash-anim.js`: pose de acidente.
- `js/input.js`: teclado, toque, gamepad e vibração.
- `js/contact-response.js`: resolução arcade de impacto, velocidade e impulso lateral.
- `js/defense.js`: decisão de bloqueio/esquiva com tempo de reação.
- `js/physics.js`: pilotagem e aderência determinísticas.
- `js/game.js`: integração da corrida, IA, câmera, colisões e HUD.
- `tests/`: testes determinísticos e de integridade.

## Testes e limites

`npm test` executa testes de lógica e integridade de arquivos (Node.js 22+). A sintaxe dos arquivos também é verificada com `node --check`.

O impacto é uma simulação arcade determinística, não um motor completo de corpos rígidos. A corrente tem física **visual**. Esta versão não contém áudio gravado/voz nem malhas GLB. A renderização e a taxa de quadros em diferentes GPUs precisam ser conferidas no hardware do jogador.

## Novidades da v2.0.1

- Motos com detalhes individuais por modelo da garagem.
- Trânsito com sedãs, vans, caminhonetes, peruas e carros esportivos, mantendo a mesma física e footprint de colisão.
- Estruturas e iluminação visual à beira da pista; passagens elevadas na costa/deserto e túneis cenográficos nas serras. Os obstáculos visuais não possuem colisão adicional.
- Gráficos configuráveis com novos perfis. As sombras reais são limitadas a Alto/Ultra por padrão; podem ser forçadas no menu e são desativadas automaticamente quando o FPS cai em qualidade Automática.
- Three.js continua sendo carregado por CDN (conexão de internet necessária). Execute a partir de `INICIAR-JOGO.bat` ou de um servidor HTTP.

## Novidades v2.0.1

- C ou botão ▣ no HUD: alterna câmera Clássica, Esportiva e Cinemática. Controles padrão: clique no analógico direito (R3).
- Menu: escolha câmera inicial e iluminação Dinâmica, Suave ou Cinematográfica.
- Modo Leve: iluminação econômica, sem luz de preenchimento adicional.
- A câmera selecionada fica salva neste navegador.

## v2.0.4 — Modelo do jogador sempre à frente do cenário

- Asfalto, carros, rivais, cenário e objetos continuam sendo renderizados na cena principal.
- A moto e o piloto são desenhados numa segunda cena WebGL, com limpeza **apenas da profundidade**, impedindo que algum objeto do cenário esconda sua moto. A sombra do chão permanece na primeira cena.
- A luz da motocicleta acompanha a iluminação global da pista.
- **Diagnóstico**: pressione **F9** durante o jogo (ou abra o endereço com `?debug=1`). O painel mostra `heroAttached`, `meshCount`, `visibleMeshes`, `glCalls`, `cameraXYZ` e `projectedHero`. Se mesmo assim o modelo não aparecer, copie esses valores para investigar o contexto WebGL e os draw calls.
- **Ferramentas open source pesquisadas**:
  - Spector.js — https://github.com/BabylonJS/Spector.js — extensão WebGL para capturar o frame, shaders e draw calls; útil caso o problema continue.
  - glTF-Transform — https://github.com/donmccurdy/glTF-Transform — pipeline futuro de simplificação e compressão de modelos GLB externos.
  - meshoptimizer — https://github.com/zeux/meshoptimizer — otimizador de geometria para novos assets, especialmente em máquinas fracas.

O código atual usa motos procedurais em Three.js, não GLBs externos. Por isso, glTF-Transform e meshoptimizer são recomendações para a futura entrada de assets, e **não** foram integrados à execução agora. Spector.js também não é carregado automaticamente: o diagnóstico F9 não depende de bibliotecas adicionais nem da rede. Na versão 2.0.4, a moto renderizada na frente do cenário pode sobrepor objetos muito próximos (compromisso para impedir o desaparecimento da moto até investigarmos diferenças de GPU).

## Diagnóstico real da moto — v2.0.4

- **F9** mostra chamadas 3D e a diferença efetiva dos pixels da moto na GPU.
- Se a GPU envia as malhas, mas não grava pixels, o jogo ativa automaticamente uma **representação 2D de segurança** do jogador, mantendo física, câmera, armas, colisões e sombras normais.
- **F10** força/libera manualmente o modo visual de segurança. É uma solução de contingência; a renderização original 3D permanece ativa e seu resultado será confirmado em teste no seu navegador.
- Leituras `gl.readPixels` apenas a cada 1,6 s durante corrida; em modo menu, pausas ou quedas, não executa leituras.
- O overlay não substitui modelos 3D de outros pilotos, nem oferece rig 3D completo.
