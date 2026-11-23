import type { PhaseId, TaskDef } from './types';

export const TITLES = [
  'Novato do Rodo',
  'Aprendiz da Vassoura',
  'Escudeiro do Pano',
  'Cavaleiro do Detergente',
  'Mago do Multiuso',
  'Guardião do Box',
  'Lorde da Lavanderia',
  'Arquimago da Faxina',
  'Mestre da Casa',
];

export const PHASES: { id: PhaseId; name: string; short: string; emoji: string }[] = [
  { id: 'prep', name: 'Preparação', short: 'Preparação', emoji: '🧺' },
  { id: 'quarto', name: 'Quarto', short: 'Quarto', emoji: '🛏️' },
  { id: 'escritorio', name: 'Escritório e hall de entrada', short: 'Escritório', emoji: '💻' },
  { id: 'sala', name: 'Sala', short: 'Sala', emoji: '🛋️' },
  { id: 'cozinha', name: 'Cozinha', short: 'Cozinha', emoji: '🍳' },
  { id: 'banheiro', name: 'Banheiro', short: 'Banheiro', emoji: '🚿' },
  { id: 'fechamento', name: 'Fechamento', short: 'Fechamento', emoji: '✨' },
];

export const ROOM_IDS = ['quarto', 'escritorio', 'sala', 'cozinha', 'banheiro'] as const;

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/* ------------------------------------------------------------------ */
/* Rotinas diárias                                                     */
/* ------------------------------------------------------------------ */
const DAILY: TaskDef[] = [
  {
    id: 'm-cama', kind: 'daily', when: 'manha', name: 'Arrumar a cama',
    tip: 'Lençol esticado, travesseiros no lugar e edredom por cima.',
    master: 'Arrume logo depois de levantar, antes de pegar o celular. Quem levanta por último arruma: leva 2 minutos e muda a cara do quarto o dia todo.',
    keep: 'Amarre ao primeiro gesto do dia: pé no chão, cama arrumada. Se um dia falhar, só não deixe falhar dois dias seguidos.',
  },
  {
    id: 'm-cama2', kind: 'daily', when: 'manha', parent: 'm-cama', name: 'Nada em cima da cama ou da cadeira',
    tip: 'Roupa usada vai para o cesto ou de volta para o cabide.',
    master: 'A "cadeira-armário" é o primeiro sinal de bagunça. Regra simples: o que foi usado e vai usar de novo volta para o cabide; o resto vai para o cesto.',
  },
  {
    id: 'm-toalhas', kind: 'daily', when: 'manha', preConsolidated: true, name: 'Toalhas de rosto e de corpo estendidas abertas',
    tip: 'Abertas secam rápido e não ficam com cheiro.',
    master: 'Toalha dobrada ou embolada não seca por dentro e cria cheiro de mofo. Bem aberta no suporte ou no varal, ela dura mais entre as lavagens.',
    keep: 'Vocês já fazem isso sempre. Continuem!',
  },
  {
    id: 'm-toalhas2', kind: 'daily', when: 'manha', parent: 'm-toalhas', name: 'Trocar as toalhas de rosto e de corpo a cada uns 3 usos',
    tip: 'Segunda é dia de lavar toalhas: combine a troca com a lavagem.',
    master: 'Toalha de corpo bem seca entre os usos aguenta uns 3 banhos. Deixe um jogo limpo à mão para trocar no domingo à noite e ele já entra na máquina na segunda.',
  },
  {
    id: 'm-janelas', kind: 'daily', when: 'manha', defaultOff: true, name: 'Abrir as janelas por 10 minutos',
    tip: 'Ventilar renova o ar e reduz a umidade.',
    master: 'Dez minutos de janela aberta pela manhã já trocam o ar do apartamento. Se o prédio for barulhento ou poluído, prefira o fim da tarde.',
  },
  {
    id: 'm-box', kind: 'daily', when: 'manha', name: 'Puxar a água do box com o rodo depois do banho',
    tip: 'Rodinho no vidro e no chão: 30 segundos.',
    master: 'Água parada no vidro vira mancha de calcário e no rejunte vira mofo. Deixe o rodinho pendurado dentro do box para não ter desculpa.',
  },
  {
    id: 'm-box2', kind: 'daily', when: 'manha', parent: 'm-box', name: 'Secar torneira e metais com um pano depois do rodo',
    tip: 'Metal seco não fica com marca de água.',
    master: 'Um paninho de microfibra só para os metais do banheiro resolve. Passe na torneira e no registro do chuveiro: brilho de hotel sem produto nenhum.',
  },
  {
    id: 'm-cafe', kind: 'daily', when: 'manha', name: 'Lavar a louça do café',
    tip: 'Xícaras e pratinhos lavados antes de sair.',
    master: 'Louça do café é pouca e sai fácil com água morna. Deixada para a noite, o café e a manteiga grudam e viram o dobro do trabalho.',
  },
  {
    id: 'm-cafe2', kind: 'daily', when: 'manha', parent: 'm-cafe', name: 'Pia da cozinha vazia antes de sair de casa',
    tip: 'Nada de copo "de molho" esperando o fim do dia.',
    master: 'Pia vazia é efeito dominó ao contrário: ninguém quer ser o primeiro a largar um copo sujo numa pia limpa.',
  },
  {
    id: 'n-louca', kind: 'daily', when: 'noite', name: 'Louça do jantar lavada',
    tip: 'Comece pelos copos, depois pratos, talheres e panelas.',
    master: 'Ordem de lavar: do mais limpo para o mais engordurado. Assim a esponja e a água ficam limpas por mais tempo e você gasta menos detergente.',
  },
  {
    id: 'n-louca2', kind: 'daily', when: 'noite', parent: 'n-louca', name: 'Secar e guardar a louça antes de dormir',
    tip: 'Escorredor vazio de manhã.',
    master: 'Escorredor cheio vira armário extra. Guardar a louça leva 3 minutos e deixa a pia pronta para o café do dia seguinte.',
  },
  {
    id: 'n-bancada', kind: 'daily', when: 'noite', name: 'Passar pano na bancada e no fogão',
    tip: 'Detergente neutro diluído e pano de microfibra.',
    master: 'Gordura fresca sai só com água e detergente. Esperou a semana? Ela polimeriza e precisa de desengordurante. Pano todo dia poupa o dia da faxina.',
  },
  {
    id: 'n-bancada2', kind: 'daily', when: 'noite', parent: 'n-bancada', name: 'Pano de prato trocado e pendurado para secar',
    tip: 'Pano úmido amontoado é criadouro de bactérias.',
    master: 'Pendure o pano aberto para secar e troque a cada um ou dois dias. Pano de prato é só para louça limpa, nunca para a bancada.',
  },
  {
    id: 'n-lixo', kind: 'daily', when: 'noite', name: 'Tirar o lixo da cozinha se estiver cheio',
    tip: 'Lixo orgânico não dorme em casa no calor.',
    master: 'Lixo orgânico à noite atrai mosquitinho. Se a lixeira estiver pela metade e com restos de comida, vale descer mesmo assim.',
  },
  {
    id: 'n-lixo2', kind: 'daily', when: 'noite', parent: 'n-lixo', name: 'Separar o reciclável todo dia',
    tip: 'Embalagem enxaguada e seca vai para o reciclável.',
    master: 'Dê só uma enxaguada rápida nas embalagens. Reciclável limpo não cheira e pode ficar a semana toda esperando a coleta.',
  },
  {
    id: 'n-reset', kind: 'daily', when: 'noite', name: 'Reset de 10 minutos na sala',
    tip: 'Cada coisa de volta ao seu lugar.',
    master: 'Coloque um timer de 10 minutos e vão os dois juntos. Copos para a cozinha, controles na mesa, sapatos na entrada. Acordar com a sala arrumada é outro dia.',
  },
  {
    id: 'n-reset2', kind: 'daily', when: 'noite', parent: 'n-reset', name: 'Almofadas e manta arrumadas no sofá',
    tip: 'Bata as almofadas e dobre a manta.',
    master: 'Bater as almofadas devolve o volume e tira o pó. Manta dobrada no braço do sofá deixa a sala com cara de arrumada em 30 segundos.',
  },
  {
    id: 'n-roupa', kind: 'daily', when: 'noite', name: 'Roupa usada no cesto',
    tip: 'Nada de pilha na cadeira.',
    master: 'Um cesto com duas divisórias (claras e escuras) já faz a separação da lavanderia sem esforço.',
  },
  {
    id: 'n-roupa2', kind: 'daily', when: 'noite', parent: 'n-roupa', name: 'Separar a roupa do dia seguinte',
    tip: 'Menos decisão de manhã, menos bagunça no quarto.',
    master: 'Escolher a roupa na véspera evita o "prova e larga em cima da cama" da manhã corrida.',
  },
  {
    id: 'n-varal', kind: 'daily', when: 'noite', name: 'Recolher e dobrar a roupa seca do varal',
    tip: 'Roupa seca no varal acumula pó e amassa.',
    master: 'Dobre na hora de tirar do varal, peça por peça. Camiseta dobrada direto do varal quase dispensa ferro.',
  },
  {
    id: 'n-varal2', kind: 'daily', when: 'noite', parent: 'n-varal', name: 'Guardar a roupa dobrada no mesmo dia',
    tip: 'Pilha dobrada no sofá não conta como guardada.',
    master: 'Roupa dobrada fora do armário desdobra sozinha. Guardar leva menos de 5 minutos quando é só a carga do dia.',
  },
];

/* ------------------------------------------------------------------ */
/* Lavanderia (segunda a quinta)                                       */
/* ------------------------------------------------------------------ */
const LAUNDRY: TaskDef[] = [
  {
    id: 'lav-seg', kind: 'laundry', weekday: 1, name: 'Toalhas de rosto e de corpo',
    tip: 'Água morna, sem amaciante (ele tira a absorção).',
    master: 'Toalha não precisa de amaciante: ele cria uma película que deixa a toalha menos absorvente. Meio copo de vinagre de álcool no compartimento do amaciante deixa macia e tira cheiro. Nunca junto com água sanitária.',
  },
  {
    id: 'lav-ter', kind: 'laundry', weekday: 2, name: 'Roupas brancas',
    tip: 'Só brancas: uma peça colorida tinge a carga inteira.',
    master: 'Confira os bolsos e vire do avesso o que tiver estampa. Para encardido, deixe de molho em água morna com sabão em pó por 30 minutos antes de bater.',
  },
  {
    id: 'lav-qua', kind: 'laundry', weekday: 3, name: 'Roupas coloridas',
    tip: 'Do avesso e em água fria para não desbotar.',
    master: 'Água fria preserva a cor e economiza energia. Jeans do avesso e com zíper fechado. Peça nova que solta tinta vai sozinha nas primeiras lavagens.',
  },
  {
    id: 'lav-qui', kind: 'laundry', weekday: 4, name: 'Íntimas e fitness',
    tip: 'Saquinho de lavar para sutiã e sem amaciante na roupa de academia.',
    master: 'Amaciante entope o tecido técnico e prende o cheiro de suor. Lave a roupa fitness do avesso, em água fria e seque à sombra. Sutiãs fechados e dentro do saquinho.',
  },
];

/* ------------------------------------------------------------------ */
/* Raid de sexta                                                       */
/* ------------------------------------------------------------------ */
const RAID: TaskDef[] = [
  // Preparação
  {
    id: 'p-cama', kind: 'raid', phase: 'prep', min: 6, name: 'Tirar toda a roupa de cama e pôr na máquina',
    tip: 'Lençóis, fronhas e capa do edredom: ciclo normal.',
    master: 'Começando pela roupa de cama, a máquina trabalha enquanto vocês limpam. Até o fechamento ela já bateu e centrifugou.',
  },
  {
    id: 'p-forrar', kind: 'raid', phase: 'prep', min: 5, name: 'Forrar a cama com o jogo reserva',
    tip: 'Ter dois jogos é o que faz o dia da faxina funcionar.',
    master: 'Forre já agora: a cama arrumada vira referência visual e o quarto fica pronto mais cedo. O jogo que está na máquina vira o reserva da semana que vem.',
  },
  {
    id: 'p-produto', kind: 'raid', phase: 'prep', min: 4, name: 'Aplicar produto no vaso, pia e box e deixar agir',
    tip: 'O banheiro fica de molho enquanto vocês fazem o resto.',
    master: 'Produto precisa de tempo de contato para funcionar. Aplicando no começo, quando chegar a vez do banheiro a sujeira sai quase sem esfregar. Janela aberta e luva.',
  },
  {
    id: 'p-kits', kind: 'raid', phase: 'prep', min: 4, name: 'Separar os kits: banheiro de um lado, cozinha do outro',
    tip: 'Panos de cores diferentes para cada área.',
    master: 'Uma cor de pano para o banheiro e outra para a cozinha, sem exceção. É a regra que mais evita levar bactéria do vaso para a bancada.',
  },
  {
    id: 'p-lixos', kind: 'raid', phase: 'prep', min: 4, name: 'Recolher o lixo de todos os cômodos',
    tip: 'Um saco grande passando por toda a casa.',
    master: 'Juntar o lixo antes de limpar abre espaço e deixa claro o que é sujeira e o que é bagunça.',
  },
  // Quarto
  {
    id: 'q-guardar', kind: 'raid', phase: 'quarto', min: 7, name: 'Guardar roupas e objetos fora do lugar',
    tip: 'Primeiro arruma, depois limpa.',
    master: 'Não dá para limpar em volta da bagunça. Use um cesto para o que é de outro cômodo e esvazie no fim.',
  },
  {
    id: 'q-po', kind: 'raid', phase: 'quarto', min: 7, name: 'Tirar o pó de cima para baixo',
    tip: 'Prateleiras, cabeceira e criados-mudos.',
    master: 'De cima para baixo e do fundo para a porta: o pó cai no chão, que é a última coisa a limpar. Microfibra levemente úmida prende o pó em vez de espalhar.',
  },
  {
    id: 'q-espelho', kind: 'raid', phase: 'quarto', min: 4, name: 'Limpar espelho, maçanetas e interruptores',
    tip: 'Pano úmido e depois pano seco no espelho.',
    master: 'Espelho: borrife no pano, não no vidro, e seque em movimentos em "Z". Maçanetas e interruptores são os pontos mais tocados do quarto.',
  },
  {
    id: 'q-aspirar', kind: 'raid', phase: 'quarto', min: 7, name: 'Aspirar ou varrer, inclusive embaixo da cama',
    tip: 'Embaixo da cama é onde mora o pó.',
    master: 'Use o bico fino do aspirador nos cantos e no rodapé. Varrer levanta pó: se não tiver aspirador, use vassoura de pelo macio e devagar.',
  },
  {
    id: 'q-pano', kind: 'raid', phase: 'quarto', min: 5, name: 'Passar pano no chão',
    tip: 'Do fundo do quarto em direção à porta.',
    master: 'Pano bem torcido: chão encharcado estraga piso de madeira e laminado. Comece no canto mais distante para não pisar no molhado.',
  },
  // Escritório / hall
  {
    id: 'e-mesa', kind: 'raid', phase: 'escritorio', min: 7, name: 'Organizar e limpar a mesa, o monitor e o teclado',
    tip: 'Tela só com pano de microfibra seco.',
    master: 'Nunca borrife produto direto na tela. No teclado, vire de cabeça para baixo e dê umas batidinhas antes de passar o pano levemente úmido com álcool 70%.',
  },
  {
    id: 'e-sapatos', kind: 'raid', phase: 'escritorio', min: 4, name: 'Organizar os sapatos da entrada',
    tip: 'Sapato da rua não passa do hall.',
    master: 'Deixar os sapatos na entrada reduz muito a sujeira que circula pela casa. Uma sapateira simples resolve o caos.',
  },
  {
    id: 'e-porta', kind: 'raid', phase: 'escritorio', min: 4, name: 'Limpar porta de entrada, maçanetas e interruptores',
    tip: 'Pano com detergente neutro diluído.',
    master: 'A maçaneta da porta de entrada é a mais "rua" da casa. Álcool 70% num pano resolve depois de limpar a sujeira visível.',
  },
  {
    id: 'e-chao', kind: 'raid', phase: 'escritorio', min: 7, name: 'Aspirar e passar pano no chão',
    tip: 'Incluindo o tapete da entrada.',
    master: 'Bata o tapete da entrada fora de casa ou aspire dos dois lados. Ele segura a sujeira que entraria no resto do apartamento.',
  },
  // Sala
  {
    id: 's-po', kind: 'raid', phase: 'sala', min: 7, name: 'Tirar o pó de móveis, rack e TV',
    tip: 'Pano seco e macio na tela da TV.',
    master: 'Atrás da TV e do rack junta muito pó e fio. Uma passada mensal ali evita aquela camada cinza que vai para o ar.',
  },
  {
    id: 's-sofa', kind: 'raid', phase: 'sala', min: 7, name: 'Aspirar o sofá e bater as almofadas',
    tip: 'Bico estreito entre os assentos.',
    master: 'Tire as almofadas do assento e aspire as frestas: é onde caem farelos, moedas e controles perdidos.',
  },
  {
    id: 's-mesa', kind: 'raid', phase: 'sala', min: 4, name: 'Limpar a mesa e as cadeiras',
    tip: 'Detergente neutro, nada de multiuso em madeira.',
    master: 'Em madeira envernizada, use pano úmido com pouquíssimo detergente e seque na sequência. Encosto de cadeira também acumula gordura das mãos.',
  },
  {
    id: 's-chao', kind: 'raid', phase: 'sala', min: 10, name: 'Aspirar e passar pano no chão',
    tip: 'Afaste o que for leve para limpar embaixo.',
    master: 'Mova a mesa de centro e o pufe. Não precisa arrastar o sofá toda semana: isso está no radar.',
  },
  // Cozinha
  {
    id: 'c-louca', kind: 'raid', phase: 'cozinha', min: 7, name: 'Louça toda lavada e pia vazia',
    tip: 'Pia vazia antes de limpar o resto.',
    master: 'Começar pela louça libera a pia para lavar os panos e as grelhas do fogão depois.',
  },
  {
    id: 'c-fogao', kind: 'raid', phase: 'cozinha', min: 10, name: 'Limpar o fogão: grades, queimadores e mesa',
    tip: 'Grades de molho em água quente com detergente.',
    master: 'Coloque as grades e os queimadores de molho na pia com água quente e detergente logo no começo da cozinha. Quando terminar o resto, a gordura já soltou.',
  },
  {
    id: 'c-micro', kind: 'raid', phase: 'cozinha', min: 4, name: 'Limpar o micro-ondas por dentro',
    tip: 'Tigela com água e limão, 3 minutos ligado.',
    master: 'O vapor de água com limão amolece a sujeira: espere 2 minutos com a porta fechada e passe o pano. Sai tudo sem esfregar.',
  },
  {
    id: 'c-bancada', kind: 'raid', phase: 'cozinha', min: 7, name: 'Bancadas, azulejos e eletros por fora',
    tip: 'Limpar primeiro, desinfetar depois.',
    master: 'Detergente para tirar a gordura, enxágue com pano úmido e só então álcool 70% onde se manipula comida. Desinfetante em superfície suja não funciona.',
  },
  {
    id: 'c-geladeira', kind: 'raid', phase: 'cozinha', min: 4, name: 'Conferir a geladeira e jogar fora o vencido',
    tip: 'Uma olhada rápida antes das compras do fim de semana.',
    master: 'Fazer isso no dia da faxina casa com a lista de compras do fim de semana. Potes antigos para a frente, novos para o fundo.',
  },
  {
    id: 'c-lixo', kind: 'raid', phase: 'cozinha', min: 4, name: 'Trocar o saco de lixo e lavar a lixeira se precisar',
    tip: 'Seque bem antes de pôr o saco novo.',
    master: 'Uma folha de jornal ou papel toalha no fundo da lixeira absorve vazamentos e evita cheiro.',
  },
  {
    id: 'c-chao', kind: 'raid', phase: 'cozinha', min: 7, name: 'Varrer e passar pano no chão',
    tip: 'Detergente neutro na água corta a gordura do piso.',
    master: 'O chão da cozinha tem gordura que só água não tira. Uma colher de detergente no balde resolve; enxágue se ficar escorregadio.',
  },
  // Banheiro
  {
    id: 'b-box', kind: 'raid', phase: 'banheiro', min: 10, name: 'Esfregar o box e os azulejos e enxaguar',
    tip: 'O produto já agiu desde a preparação.',
    master: 'Esfregue com esponja não abrasiva no vidro e escova no rejunte. Enxágue bem e passe o rodo. Para manchas de calcário, vinagre diluído (sozinho, nunca com água sanitária).',
  },
  {
    id: 'b-pia', kind: 'raid', phase: 'banheiro', min: 5, name: 'Pia, torneira e espelho',
    tip: 'Seque a torneira no fim para brilhar.',
    master: 'Use uma escova de dentes velha em volta da torneira e no ralo da pia: é onde o limo se esconde.',
  },
  {
    id: 'b-vaso', kind: 'raid', phase: 'banheiro', min: 7, name: 'Esfregar o vaso: dentro, assento e base',
    tip: 'Sempre por último no banheiro e com o pano do banheiro.',
    master: 'Ordem: de dentro para fora e de cima para baixo (tampa, assento, borda, base). Dê descarga com a tampa fechada. Esse pano nunca vai para outra área.',
  },
  {
    id: 'b-ralo', kind: 'raid', phase: 'banheiro', min: 4, name: 'Limpar o ralo',
    tip: 'Tire o cabelo antes de jogar água.',
    master: 'Cabelo acumulado é o que entope e dá cheiro. Tire com luva, escove a grelha e jogue água quente.',
  },
  {
    id: 'b-chao', kind: 'raid', phase: 'banheiro', min: 6, name: 'Chão do banheiro e tapete trocado',
    tip: 'Tapete sujo vai para o cesto dos panos.',
    master: 'Passe o rodo em direção ao ralo e seque os cantos. Tapete de banheiro troca toda semana.',
  },
  // Fechamento
  {
    id: 'f-estender', kind: 'raid', phase: 'fechamento', min: 6, name: 'Estender a roupa de cama lavada',
    tip: 'Bem esticada no varal para secar rápido e amassar menos.',
    master: 'Estenda os lençóis dobrados ao meio no varal e as fronhas pelas pontas. Sacuda bem antes: amassa muito menos e quase dispensa o ferro.',
  },
  {
    id: 'f-panos', kind: 'raid', phase: 'fechamento', min: 2, name: 'Separar os panos de limpeza para lavar',
    tip: 'Banheiro e cozinha em sacos separados.',
    master: 'Panos de limpeza lavam juntos entre si, nunca com roupa. Vão para a máquina quando juntar uma carga.',
  },
  {
    id: 'f-guardar', kind: 'raid', phase: 'fechamento', min: 4, name: 'Guardar produtos, balde e vassouras',
    tip: 'Balde lavado e virado para secar.',
    master: 'Guarde os produtos fechados, longe do calor e fora do alcance de pets. Balde e rodo secos não criam cheiro no armário.',
  },
  {
    id: 'f-lixo', kind: 'raid', phase: 'fechamento', min: 4, name: 'Descer o lixo e o reciclável',
    tip: 'Sem lixo dormindo em casa limpa.',
    master: 'Último passo antes de relaxar: desce tudo e a casa fica pronta para o fim de semana.',
  },
  {
    id: 'f-volta', kind: 'raid', phase: 'fechamento', min: 2, name: 'Dar uma volta pela casa e curtir o resultado',
    tip: 'Vocês merecem!',
    master: 'Reparar no resultado não é bobagem: é o que faz o cérebro querer repetir na próxima semana. Banho, jantar e sofá.',
  },
];

/* ------------------------------------------------------------------ */
/* Radar de cantos esquecidos (26)                                     */
/* ------------------------------------------------------------------ */
const RADAR: TaskDef[] = [
  { id: 'r-esponja', every: 15, name: 'Trocar a esponja da cozinha', tip: 'Esponja velha espalha mais bactéria do que limpa.', master: 'Entre as trocas, esprema bem e deixe secar em pé. Esponja com cheiro já passou do ponto.' },
  { id: 'r-panos-prato', every: 15, name: 'Ferver ou lavar os panos de prato em água quente', tip: 'Água bem quente com sabão.', master: 'Panos de prato vão separados da roupa. Água quente e sabão de coco resolvem o encardido e o cheiro.' },
  { id: 'r-ralo-pia', every: 15, name: 'Limpar o ralo e o sifão da pia da cozinha', tip: 'Água quente com detergente previne entupimento.', master: 'Tire a grelha do ralo, escove e jogue uma chaleira de água quente com detergente para desfazer a gordura.' },
  { id: 'r-escova-vaso', every: 15, name: 'Lavar a escova do vaso e o suporte', tip: 'O suporte junta água parada.', master: 'Lave com água quente e detergente, enxágue e deixe secar presa entre a tampa e o vaso antes de guardar.' },
  { id: 'r-geladeira', every: 30, name: 'Limpar dentro da geladeira: prateleiras e gavetas', tip: 'Água morna com bicarbonato.', master: 'Uma colher de bicarbonato em meio litro de água morna limpa e tira cheiro sem deixar perfume nos alimentos.' },
  { id: 'r-filtro-maquina', every: 30, name: 'Limpar o filtro da máquina de lavar', tip: 'Fica na frente, embaixo, atrás de uma tampinha.', master: 'Ponha uma toalha e um pote raso embaixo antes de abrir: sempre sai água. Filtro sujo deixa roupa com cheiro.' },
  { id: 'r-tambor', every: 30, name: 'Rodar o ciclo de limpeza da máquina e limpar a borracha', tip: 'Máquina vazia, ciclo mais quente.', master: 'A borracha da porta junta fiapos e limo. Seque depois de cada uso e deixe a porta entreaberta.' },
  { id: 'r-tapetes', every: 30, name: 'Lavar os tapetes', tip: 'Banheiro, cozinha e entrada.', master: 'Tapetes com borracha antiderrapante: água fria e secar à sombra para a borracha não ressecar.' },
  { id: 'r-lixeiras', every: 30, name: 'Lavar as lixeiras do banheiro e da cozinha', tip: 'Por dentro e por fora, e secar bem.', master: 'Lave no box com água e detergente, enxágue e seque ao sol se der. Lixeira seca não cria cheiro.' },
  { id: 'r-rodapes', every: 30, name: 'Limpar os rodapés', tip: 'Pano úmido percorrendo a casa toda.', master: 'Rodapé limpo dá sensação de casa recém-pintada. Uma meia velha na mão facilita muito.' },
  { id: 'r-controles', every: 30, name: 'Desinfetar controles, celulares e teclado', tip: 'Álcool 70% no pano, nunca direto.', master: 'Tire as pilhas do controle antes, use cotonete nas frestas. São os objetos mais tocados da casa.' },
  { id: 'r-forno', every: 30, name: 'Limpar o forno', tip: 'Pasta de bicarbonato e água, de molho.', master: 'Passe a pasta de bicarbonato com forno frio, deixe agir algumas horas e tire com pano úmido.' },
  { id: 'r-coifa', every: 30, name: 'Lavar o filtro da coifa ou depurador', tip: 'Água quente e desengordurante.', master: 'Filtro entupido de gordura não puxa a fumaça e pinga óleo no fogão. De molho em água quente com detergente.' },
  { id: 'r-janelas', every: 60, name: 'Limpar janelas e vidros por dentro', tip: 'Dia nublado: o sol seca rápido e mancha.', master: 'Água com um pouco de detergente e rodinho de vidro. Seque as bordas com pano de microfibra.' },
  { id: 'r-trilhos', every: 60, name: 'Limpar os trilhos das janelas e do box', tip: 'Aspirador com bico fino e depois pincel.', master: 'Aspire a sujeira seca primeiro, depois escove com pincel e pano úmido. Trilho limpo faz a porta correr leve.' },
  { id: 'r-armarios', every: 60, name: 'Tirar o pó de cima dos armários', tip: 'Escada firme e pano úmido.', master: 'Forrar o topo dos armários com papel-manteiga faz a próxima limpeza ser só trocar a folha.' },
  { id: 'r-sofa', every: 60, name: 'Limpar atrás e embaixo do sofá', tip: 'Afaste o sofá e aspire.', master: 'É onde se acumula pó, cabelo e farelo. Aproveite e aspire o forro de baixo do sofá.' },
  { id: 'r-despensa', every: 60, name: 'Revisar a despensa e jogar fora o vencido', tip: 'Mais velho na frente.', master: 'Esvazie uma prateleira por vez, passe pano e volte com os mais antigos na frente.' },
  { id: 'r-borracha-geladeira', every: 60, name: 'Limpar as borrachas da porta da geladeira', tip: 'Escova de dentes e água com bicarbonato.', master: 'Borracha suja descola e deixa o frio escapar. Seque bem as dobras.' },
  { id: 'r-cortinas', every: 90, name: 'Lavar ou aspirar as cortinas', tip: 'Confira a etiqueta antes de lavar.', master: 'Cortinas leves vão para a máquina no ciclo delicado. Pesadas: aspire com o bico de escova.' },
  { id: 'r-luminarias', every: 90, name: 'Limpar luminárias e lustres', tip: 'Luz desligada e lâmpada fria.', master: 'Uma luminária limpa ilumina bem mais. Pano seco nas lâmpadas e úmido nas cúpulas.' },
  { id: 'r-ar', every: 90, name: 'Limpar o filtro do ar-condicionado ou as pás do ventilador', tip: 'Fronha velha nas pás do ventilador.', master: 'Enfie a fronha na pá e puxe: o pó fica dentro dela. Filtro do ar: água corrente e secar à sombra.' },
  { id: 'r-edredom', every: 90, name: 'Lavar o edredom e as mantas', tip: 'Se não couber na máquina, lavanderia.', master: 'Edredom precisa secar muito bem por dentro para não mofar: dia de sol e virando de lado.' },
  { id: 'r-rejunte', every: 90, name: 'Limpar o rejunte do banheiro', tip: 'Bicarbonato e escova; água sanitária só pontual.', master: 'Água sanitária desgasta o rejunte: use pontualmente, diluída em água, e enxágue bem. Nunca misture com outro produto.' },
  { id: 'r-colchao', every: 180, name: 'Arejar, aspirar e virar o colchão', tip: 'Aspirador e janela aberta.', master: 'Virar (ou girar) o colchão distribui o desgaste. Polvilhe bicarbonato, espere 30 minutos e aspire para tirar odor.' },
  { id: 'r-travesseiros', every: 180, name: 'Lavar os travesseiros', tip: 'Confira se a etiqueta permite máquina.', master: 'Lave dois de uma vez para equilibrar o tambor e seque muito bem ao sol. Travesseiro com mais de 2 anos merece troca.' },
].map((t) => ({ ...t, kind: 'radar' as const }));

export const BASE_TASKS: TaskDef[] = [...DAILY, ...LAUNDRY, ...RAID, ...RADAR];

/* ------------------------------------------------------------------ */
/* Guia                                                                */
/* ------------------------------------------------------------------ */
export const SAFETY: { title: string; text: string; icon: string }[] = [
  { icon: '⚠️', title: 'Nunca misture água sanitária', text: 'Água sanitária não se mistura com vinagre, amônia, álcool, desinfetante nem com outro produto: a mistura solta gases tóxicos. Ela só se dilui em água.' },
  { icon: '🧽', title: 'Limpe antes de desinfetar', text: 'Desinfetante não age através da sujeira. Primeiro tire a sujeira com água e detergente, enxágue e só então desinfete.' },
  { icon: '📏', title: 'Use a dose do rótulo', text: 'Mais produto não limpa mais: deixa resíduo, mancha e faz mal. Siga a diluição da embalagem.' },
  { icon: '🛁', title: 'Água sanitária só de forma pontual', text: 'Ela desgasta e escurece o rejunte com o tempo. Use só quando precisar, diluída, e enxágue bem.' },
  { icon: '🪟', title: 'Janela aberta e luva', text: 'Ventile o cômodo enquanto usa produto e proteja as mãos com luva de borracha.' },
  { icon: '🎨', title: 'Kits e panos separados', text: 'Banheiro e cozinha têm panos, esponjas e baldes próprios, de cores diferentes. Nunca troque um pelo outro.' },
];

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const CHANNELS: { name: string; about: string; url: string }[] = [
  { name: 'Organize sem Frescuras', about: 'Organização e rotina de casa', url: yt('Organize sem Frescuras') },
  { name: 'A Dica do Dia (Flávia Ferrari)', about: 'Truques rápidos de limpeza', url: yt('A Dica do Dia Flávia Ferrari limpeza') },
  { name: 'A Giovana Antunes', about: 'Faxina e organização', url: yt('Giovana Antunes faxina') },
  { name: 'Júlia Rosa', about: 'Rotina de limpeza da casa', url: yt('Júlia Rosa limpeza casa') },
  { name: 'Bruna Leal', about: 'Faxina prática', url: yt('Bruna Leal faxina') },
  { name: 'Dr. Bactéria', about: 'Higiene e segurança dos produtos', url: yt('Dr. Bactéria limpeza') },
  { name: 'Reorganize (Priscila Sabóia)', about: 'Organização de ambientes', url: yt('Reorganize Priscila Sabóia') },
  { name: 'HumDiarista', about: 'Técnicas de diarista profissional', url: yt('HumDiarista limpeza') },
];

export const LESSONS: { name: string; url: string }[] = [
  { name: 'Limpar o banheiro', url: yt('como limpar banheiro rápido e bem feito') },
  { name: 'Box de vidro sem manchas', url: yt('como limpar box de vidro manchado') },
  { name: 'Limpar o vaso sanitário', url: yt('como limpar vaso sanitário corretamente') },
  { name: 'Limpar o fogão', url: yt('como limpar fogão grades queimadores') },
  { name: 'Limpar a geladeira', url: yt('como limpar geladeira por dentro') },
  { name: 'Limpar a máquina de lavar', url: yt('como limpar máquina de lavar filtro borracha') },
  { name: 'Separar a roupa para lavar', url: yt('como separar roupa para lavar') },
  { name: 'Passar pano no chão', url: yt('como passar pano no chão do jeito certo') },
];

export const LAUNDRY_GUIDE: { day: string; what: string; note: string }[] = [
  { day: 'Segunda', what: 'Toalhas de rosto e de corpo', note: 'Água morna e sem amaciante.' },
  { day: 'Terça', what: 'Roupas brancas', note: 'Só brancas, bolsos vazios.' },
  { day: 'Quarta', what: 'Roupas coloridas', note: 'Do avesso e água fria.' },
  { day: 'Quinta', what: 'Íntimas e fitness', note: 'Saquinho e sem amaciante.' },
  { day: 'Dia da faxina', what: 'Toda a roupa de cama', note: 'Vai para a máquina no começo da raid; a cama é forrada com o jogo reserva e no fechamento vocês estendem.' },
  { day: 'Quando juntar', what: 'Delicadas e panos de limpeza', note: 'Delicadas no ciclo delicado e em saquinho. Panos de limpeza sempre separados da roupa.' },
];

/* ------------------------------------------------------------------ */
/* Produtos e compras                                                  */
/* ------------------------------------------------------------------ */
export const DEFAULT_PRODUCTS = [
  'Detergente',
  'Sabão em pó ou líquido',
  'Amaciante',
  'Água sanitária',
  'Desinfetante',
  'Multiuso',
  'Desengordurante',
  'Limpa-vidros',
  'Vinagre de álcool',
  'Bicarbonato de sódio',
  'Álcool 70%',
  'Esponjas',
  'Panos de microfibra',
  'Luvas de borracha',
  'Sacos de lixo',
  'Papel higiênico',
  'Papel toalha',
];

/* ------------------------------------------------------------------ */
/* Cômodos extras (modelos com tarefas sugeridas)                      */
/* ------------------------------------------------------------------ */
export const ROOM_TEMPLATES: { name: string; emoji: string; tasks: string[] }[] = [
  { name: 'Área de serviço', emoji: '🧼', tasks: ['Limpar o tanque e a torneira', 'Organizar os produtos de limpeza', 'Passar pano no chão'] },
  { name: 'Varanda', emoji: '🪴', tasks: ['Varrer a varanda', 'Limpar o vidro e o guarda-corpo', 'Regar e limpar as plantas'] },
  { name: 'Lavabo', emoji: '🚽', tasks: ['Pia e espelho', 'Esfregar o vaso', 'Chão do lavabo'] },
  { name: 'Quarto de hóspedes', emoji: '🛌', tasks: ['Tirar o pó dos móveis', 'Aspirar e passar pano no chão'] },
  { name: 'Closet', emoji: '👗', tasks: ['Organizar as roupas fora do lugar', 'Tirar o pó das prateleiras'] },
  { name: 'Corredor', emoji: '🚪', tasks: ['Tirar o pó de quadros e interruptores', 'Aspirar e passar pano no chão'] },
];

/* ------------------------------------------------------------------ */
/* Mascote: evolui com o nível                                         */
/* ------------------------------------------------------------------ */
export const MASCOT_STAGES: { minLevel: number; name: string; desc: string }[] = [
  { minLevel: 1, name: 'Filhote', desc: 'Acabou de sair da embalagem.' },
  { minLevel: 3, name: 'Ajudante', desc: 'Ganhou uma bandana de faxina.' },
  { minLevel: 5, name: 'Escudeiro', desc: 'Já carrega o próprio rodo.' },
  { minLevel: 7, name: 'Mago', desc: 'Chapéu de mago e varinha de espuma.' },
  { minLevel: 9, name: 'Mestre', desc: 'Coroa de Mestre da Casa.' },
];
