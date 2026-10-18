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