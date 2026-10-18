import {Game} from './game.js';
try{const game=new Game();window.asfaltoGame=game;}catch(error){console.error(error);document.getElementById('loading').classList.add('hidden');document.getElementById('fatal').classList.remove('hidden');document.getElementById('fatal').querySelector('p').textContent=`Erro na inicialização: ${error.message}`}
