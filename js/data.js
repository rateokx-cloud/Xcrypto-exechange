// ============================================
// CRYPTOX - DATA & MARKET DATA
// 100+ Coins with real prices from CoinGecko
// ============================================

const COINS = [
  // ── TOP 10 ──────────────────────────────────────────────────────────────
  { id:'BTC',   name:'Bitcoin',            color:'#F7931A', price:67450.00, change:2.34,  vol:'$28.5B', mcap:'$1.32T', rank:1  },
  { id:'ETH',   name:'Ethereum',           color:'#627EEA', price:3842.50,  change:1.87,  vol:'$14.2B', mcap:'$462B',  rank:2  },
  { id:'BNB',   name:'BNB',                color:'#F0B90B', price:605.30,   change:-0.54, vol:'$2.1B',  mcap:'$88B',   rank:3  },
  { id:'SOL',   name:'Solana',             color:'#9945FF', price:185.40,   change:4.21,  vol:'$5.3B',  mcap:'$85B',   rank:4  },
  { id:'XRP',   name:'Ripple',             color:'#00AAE4', price:0.6234,   change:-1.23, vol:'$3.8B',  mcap:'$35B',   rank:5  },
  { id:'USDC',  name:'USD Coin',           color:'#2775CA', price:1.0000,   change:0.01,  vol:'$8.2B',  mcap:'$32B',   rank:6  },
  { id:'ADA',   name:'Cardano',            color:'#3CCAB0', price:0.4521,   change:3.12,  vol:'$0.8B',  mcap:'$16B',   rank:7  },
  { id:'AVAX',  name:'Avalanche',          color:'#E84142', price:38.75,    change:5.67,  vol:'$0.9B',  mcap:'$16B',   rank:8  },
  { id:'DOGE',  name:'Dogecoin',           color:'#C2A633', price:0.1523,   change:-2.10, vol:'$1.2B',  mcap:'$22B',   rank:9  },
  { id:'TRX',   name:'TRON',              color:'#FF0013', price:0.1234,   change:-0.34, vol:'$0.9B',  mcap:'$10.8B', rank:10 },

  // ── TOP 11–30 ────────────────────────────────────────────────────────────
  { id:'TON',   name:'Toncoin',            color:'#0098EA', price:5.82,     change:3.44,  vol:'$0.4B',  mcap:'$20B',   rank:11 },
  { id:'MATIC', name:'Polygon',            color:'#8247E5', price:0.8921,   change:2.88,  vol:'$0.5B',  mcap:'$8.7B',  rank:12 },
  { id:'DOT',   name:'Polkadot',           color:'#E6007A', price:7.85,     change:1.45,  vol:'$0.4B',  mcap:'$10B',   rank:13 },
  { id:'LINK',  name:'Chainlink',          color:'#2A5ADA', price:14.23,    change:3.45,  vol:'$0.7B',  mcap:'$8.4B',  rank:14 },
  { id:'SHIB',  name:'Shiba Inu',          color:'#FFA409', price:0.0000245,change:1.20,  vol:'$0.6B',  mcap:'$14B',   rank:15 },
  { id:'LTC',   name:'Litecoin',           color:'#BFBBBB', price:88.40,    change:0.92,  vol:'$0.6B',  mcap:'$6.6B',  rank:16 },
  { id:'BCH',   name:'Bitcoin Cash',       color:'#8DC351', price:478.20,   change:1.34,  vol:'$0.5B',  mcap:'$9.4B',  rank:17 },
  { id:'UNI',   name:'Uniswap',            color:'#FF007A', price:8.56,     change:-0.78, vol:'$0.3B',  mcap:'$5.1B',  rank:18 },
  { id:'ATOM',  name:'Cosmos',             color:'#6F7390', price:9.12,     change:2.34,  vol:'$0.3B',  mcap:'$3.5B',  rank:19 },
  { id:'XLM',   name:'Stellar',            color:'#14B6E7', price:0.1142,   change:1.56,  vol:'$0.2B',  mcap:'$3.2B',  rank:20 },

  // ── TOP 31–50 ────────────────────────────────────────────────────────────
  { id:'ETC',   name:'Ethereum Classic',   color:'#328332', price:27.80,    change:1.23,  vol:'$0.2B',  mcap:'$4.0B',  rank:21 },
  { id:'FIL',   name:'Filecoin',           color:'#0090FF', price:5.67,     change:-1.89, vol:'$0.2B',  mcap:'$3.0B',  rank:22 },
  { id:'NEAR',  name:'NEAR Protocol',      color:'#00C1DE', price:5.23,     change:6.78,  vol:'$0.5B',  mcap:'$5.7B',  rank:23 },
  { id:'ARB',   name:'Arbitrum',           color:'#28A0F0', price:1.12,     change:3.45,  vol:'$0.4B',  mcap:'$3.2B',  rank:24 },
  { id:'VET',   name:'VeChain',            color:'#15BDFF', price:0.0378,   change:2.11,  vol:'$0.1B',  mcap:'$2.7B',  rank:25 },
  { id:'ALGO',  name:'Algorand',           color:'#000000', price:0.1823,   change:1.45,  vol:'$0.1B',  mcap:'$1.5B',  rank:26 },
  { id:'HBAR',  name:'Hedera',             color:'#3ECFB1', price:0.0891,   change:4.32,  vol:'$0.2B',  mcap:'$3.5B',  rank:27 },
  { id:'OP',    name:'Optimism',           color:'#FF0420', price:2.34,     change:5.67,  vol:'$0.3B',  mcap:'$2.8B',  rank:28 },
  { id:'MKR',   name:'Maker',              color:'#1AAB9B', price:2890.00,  change:2.10,  vol:'$0.1B',  mcap:'$2.6B',  rank:29 },
  { id:'AAVE',  name:'Aave',               color:'#B6509E', price:95.40,    change:3.21,  vol:'$0.2B',  mcap:'$1.4B',  rank:30 },

  // ── 51–70 ────────────────────────────────────────────────────────────────
  { id:'GRT',   name:'The Graph',          color:'#6747ED', price:0.1723,   change:2.45,  vol:'$0.1B',  mcap:'$1.6B',  rank:31 },
  { id:'INJ',   name:'Injective',          color:'#00D4FF', price:28.45,    change:7.89,  vol:'$0.3B',  mcap:'$2.4B',  rank:32 },
  { id:'IMX',   name:'Immutable',          color:'#17B5CB', price:2.12,     change:4.56,  vol:'$0.2B',  mcap:'$3.0B',  rank:33 },
  { id:'RUNE',  name:'THORChain',          color:'#33FF99', price:5.67,     change:8.90,  vol:'$0.2B',  mcap:'$1.9B',  rank:34 },
  { id:'FTM',   name:'Fantom',             color:'#1969FF', price:0.8934,   change:6.78,  vol:'$0.3B',  mcap:'$2.5B',  rank:35 },
  { id:'SAND',  name:'The Sandbox',        color:'#00ADEF', price:0.4512,   change:3.21,  vol:'$0.1B',  mcap:'$0.8B',  rank:36 },
  { id:'MANA',  name:'Decentraland',       color:'#FF2D55', price:0.3812,   change:2.34,  vol:'$0.1B',  mcap:'$0.7B',  rank:37 },
  { id:'AXS',   name:'Axie Infinity',      color:'#0055D4', price:7.45,     change:4.56,  vol:'$0.1B',  mcap:'$1.1B',  rank:38 },
  { id:'THETA', name:'Theta Network',      color:'#2AB8E6', price:1.45,     change:1.23,  vol:'$0.1B',  mcap:'$1.5B',  rank:39 },
  { id:'XTZ',   name:'Tezos',              color:'#A6E000', price:0.9234,   change:0.89,  vol:'$0.1B',  mcap:'$0.8B',  rank:40 },

  // ── 71–90 ────────────────────────────────────────────────────────────────
  { id:'EOS',   name:'EOS',                color:'#000000', price:0.8234,   change:-0.45, vol:'$0.1B',  mcap:'$0.9B',  rank:41 },
  { id:'CHZ',   name:'Chiliz',             color:'#CD0124', price:0.1123,   change:3.45,  vol:'$0.1B',  mcap:'$1.0B',  rank:42 },
  { id:'GALA',  name:'Gala',               color:'#0B65C8', price:0.0423,   change:5.67,  vol:'$0.1B',  mcap:'$1.5B',  rank:43 },
  { id:'APT',   name:'Aptos',              color:'#00CDAC', price:9.23,     change:6.78,  vol:'$0.3B',  mcap:'$4.1B',  rank:44 },
  { id:'SUI',   name:'Sui',                color:'#6FBCF0', price:1.23,     change:8.90,  vol:'$0.3B',  mcap:'$3.4B',  rank:45 },
  { id:'CRV',   name:'Curve DAO',          color:'#40649F', price:0.5634,   change:-1.23, vol:'$0.1B',  mcap:'$0.6B',  rank:46 },
  { id:'SNX',   name:'Synthetix',          color:'#00D1FF', price:2.34,     change:2.34,  vol:'$0.1B',  mcap:'$0.7B',  rank:47 },
  { id:'LDO',   name:'Lido DAO',           color:'#F0806C', price:2.12,     change:3.45,  vol:'$0.2B',  mcap:'$1.9B',  rank:48 },
  { id:'WLD',   name:'Worldcoin',          color:'#000000', price:5.67,     change:12.34, vol:'$0.3B',  mcap:'$0.8B',  rank:49 },
  { id:'SEI',   name:'Sei',                color:'#9B2335', price:0.4523,   change:9.87,  vol:'$0.2B',  mcap:'$1.8B',  rank:50 },

  // ── 91–110 ───────────────────────────────────────────────────────────────
  { id:'TIA',   name:'Celestia',           color:'#7B2FBE', price:8.34,     change:5.43,  vol:'$0.2B',  mcap:'$1.5B',  rank:51 },
  { id:'PEPE',  name:'Pepe',               color:'#009A00', price:0.0000134,change:8.90,  vol:'$1.2B',  mcap:'$5.6B',  rank:52 },
  { id:'FLOKI', name:'Floki',              color:'#F5A623', price:0.0001823,change:6.78,  vol:'$0.2B',  mcap:'$1.8B',  rank:53 },
  { id:'WIF',   name:'dogwifhat',          color:'#A52A2A', price:2.34,     change:15.67, vol:'$0.5B',  mcap:'$2.3B',  rank:54 },
  { id:'BONK',  name:'Bonk',               color:'#F7931A', price:0.0000289,change:11.23, vol:'$0.3B',  mcap:'$1.7B',  rank:55 },
  { id:'JUP',   name:'Jupiter',            color:'#C4AC6E', price:0.8934,   change:7.45,  vol:'$0.2B',  mcap:'$1.2B',  rank:56 },
  { id:'PYTH',  name:'Pyth Network',       color:'#9B4ED5', price:0.5123,   change:4.56,  vol:'$0.1B',  mcap:'$0.7B',  rank:57 },
  { id:'JTO',   name:'Jito',               color:'#83F400', price:3.45,     change:6.78,  vol:'$0.1B',  mcap:'$0.5B',  rank:58 },
  { id:'ONDO',  name:'Ondo',               color:'#1A6BFF', price:0.9234,   change:8.90,  vol:'$0.1B',  mcap:'$1.4B',  rank:59 },
  { id:'STRK',  name:'Starknet',           color:'#EC796B', price:1.23,     change:5.67,  vol:'$0.2B',  mcap:'$0.6B',  rank:60 },

  // ── 111–130 ──────────────────────────────────────────────────────────────
  { id:'RENDER',name:'Render',             color:'#FF4B00', price:7.89,     change:9.23,  vol:'$0.2B',  mcap:'$3.7B',  rank:61 },
  { id:'FET',   name:'Fetch.ai',           color:'#1B2D44', price:1.45,     change:6.78,  vol:'$0.2B',  mcap:'$1.4B',  rank:62 },
  { id:'AGIX',  name:'SingularityNET',     color:'#5D9ED6', price:0.8934,   change:5.67,  vol:'$0.1B',  mcap:'$1.1B',  rank:63 },
  { id:'OCEAN', name:'Ocean Protocol',     color:'#131353', price:0.5623,   change:4.56,  vol:'$0.1B',  mcap:'$0.5B',  rank:64 },
  { id:'KAS',   name:'Kaspa',              color:'#49DAAA', price:0.1234,   change:3.45,  vol:'$0.2B',  mcap:'$2.9B',  rank:65 },
  { id:'JASMY', name:'JasmyCoin',          color:'#000000', price:0.0198,   change:2.34,  vol:'$0.1B',  mcap:'$0.4B',  rank:66 },
  { id:'BLUR',  name:'Blur',               color:'#FF6A00', price:0.3412,   change:7.89,  vol:'$0.1B',  mcap:'$0.6B',  rank:67 },
  { id:'1INCH', name:'1inch Network',      color:'#1B314F', price:0.4523,   change:3.21,  vol:'$0.1B',  mcap:'$0.5B',  rank:68 },
  { id:'DYDX',  name:'dYdX',               color:'#6966FF', price:2.12,     change:4.56,  vol:'$0.1B',  mcap:'$0.7B',  rank:69 },
  { id:'GMX',   name:'GMX',                color:'#03D1CF', price:35.67,    change:2.34,  vol:'$0.1B',  mcap:'$0.5B',  rank:70 },

  // ── 131–150 ──────────────────────────────────────────────────────────────
  { id:'KAVA',  name:'Kava',               color:'#FF433E', price:0.6723,   change:1.23,  vol:'$0.1B',  mcap:'$0.6B',  rank:71 },
  { id:'FLOW',  name:'Flow',               color:'#00EF8B', price:0.8934,   change:2.34,  vol:'$0.1B',  mcap:'$0.9B',  rank:72 },
  { id:'EGLD',  name:'MultiversX',         color:'#23F7DD', price:37.45,    change:3.45,  vol:'$0.1B',  mcap:'$1.0B',  rank:73 },
  { id:'ICP',   name:'Internet Computer',  color:'#F15A24', price:12.34,    change:4.56,  vol:'$0.2B',  mcap:'$5.6B',  rank:74 },
  { id:'STX',   name:'Stacks',             color:'#5546FF', price:2.12,     change:5.67,  vol:'$0.1B',  mcap:'$3.1B',  rank:75 },
  { id:'MINA',  name:'Mina Protocol',      color:'#E6007A', price:0.7823,   change:2.34,  vol:'$0.1B',  mcap:'$0.7B',  rank:76 },
  { id:'ROSE',  name:'Oasis Network',      color:'#0092F6', price:0.0934,   change:1.23,  vol:'$0.1B',  mcap:'$0.4B',  rank:77 },
  { id:'ZIL',   name:'Zilliqa',            color:'#49C1BF', price:0.0234,   change:0.89,  vol:'$0.1B',  mcap:'$0.3B',  rank:78 },
  { id:'BAT',   name:'Basic Attention',    color:'#FF5000', price:0.2312,   change:1.56,  vol:'$0.1B',  mcap:'$0.4B',  rank:79 },
  { id:'XEM',   name:'NEM',                color:'#67B2E8', price:0.0289,   change:0.45,  vol:'$0.0B',  mcap:'$0.3B',  rank:80 },

  // ── 151–170 ──────────────────────────────────────────────────────────────
  { id:'ICX',   name:'ICON',               color:'#1FC5C9', price:0.1923,   change:2.34,  vol:'$0.0B',  mcap:'$0.3B',  rank:81 },
  { id:'ZRX',   name:'0x Protocol',        color:'#302C2C', price:0.4523,   change:1.23,  vol:'$0.0B',  mcap:'$0.4B',  rank:82 },
  { id:'BAL',   name:'Balancer',           color:'#1E1E1E', price:3.45,     change:2.45,  vol:'$0.0B',  mcap:'$0.2B',  rank:83 },
  { id:'COMP',  name:'Compound',           color:'#00D395', price:56.78,    change:1.89,  vol:'$0.1B',  mcap:'$0.4B',  rank:84 },
  { id:'YFI',   name:'Yearn Finance',      color:'#006AE3', price:7823.00,  change:2.34,  vol:'$0.1B',  mcap:'$0.3B',  rank:85 },
  { id:'SUSHI', name:'SushiSwap',          color:'#FA52A0', price:1.23,     change:3.45,  vol:'$0.1B',  mcap:'$0.3B',  rank:86 },
  { id:'CAKE',  name:'PancakeSwap',        color:'#1FC7D4', price:2.89,     change:4.56,  vol:'$0.1B',  mcap:'$0.6B',  rank:87 },
  { id:'MAGIC', name:'Magic',              color:'#DC3B46', price:1.23,     change:5.67,  vol:'$0.1B',  mcap:'$0.2B',  rank:88 },
  { id:'ENS',   name:'Ethereum Name Svc',  color:'#5298FF', price:18.34,    change:3.21,  vol:'$0.1B',  mcap:'$0.5B',  rank:89 },
  { id:'RPL',   name:'Rocket Pool',        color:'#E57039', price:23.45,    change:2.34,  vol:'$0.1B',  mcap:'$0.4B',  rank:90 },

  // ── 171–190 ──────────────────────────────────────────────────────────────
  { id:'SSV',   name:'SSV Network',        color:'#0A0F2A', price:34.56,    change:4.56,  vol:'$0.1B',  mcap:'$0.3B',  rank:91 },
  { id:'API3',  name:'API3',               color:'#2E4DAD', price:2.34,     change:3.45,  vol:'$0.0B',  mcap:'$0.2B',  rank:92 },
  { id:'ARKM',  name:'Arkham',             color:'#FF5F1F', price:1.89,     change:6.78,  vol:'$0.1B',  mcap:'$0.4B',  rank:93 },
  { id:'ALT',   name:'AltLayer',           color:'#8DE3B5', price:0.2312,   change:8.90,  vol:'$0.1B',  mcap:'$0.3B',  rank:94 },
  { id:'ZETA',  name:'ZetaChain',          color:'#00D4AA', price:0.8934,   change:7.89,  vol:'$0.1B',  mcap:'$0.3B',  rank:95 },
  { id:'PIXEL', name:'Pixels',             color:'#FF6B9D', price:0.4523,   change:12.34, vol:'$0.1B',  mcap:'$0.2B',  rank:96 },
  { id:'PORTAL',name:'Portal',             color:'#7B2FBE', price:1.23,     change:9.87,  vol:'$0.1B',  mcap:'$0.2B',  rank:97 },
  { id:'DYM',   name:'Dymension',          color:'#FF6B35', price:3.45,     change:5.67,  vol:'$0.1B',  mcap:'$0.3B',  rank:98 },
  { id:'NTRN',  name:'Neutron',            color:'#1E232E', price:0.7823,   change:4.56,  vol:'$0.0B',  mcap:'$0.2B',  rank:99 },
  { id:'MANTA', name:'Manta Network',      color:'#E0485B', price:1.89,     change:6.78,  vol:'$0.1B',  mcap:'$0.3B', rank:100 },
];

// ── Binance Symbol Map (semua 100+ coin) ─────────────────────────────────
const BINANCE_SYMBOL_MAP = {
  BTC:'BTCUSDT',   ETH:'ETHUSDT',   BNB:'BNBUSDT',   SOL:'SOLUSDT',
  XRP:'XRPUSDT',   USDC:'USDCUSDT', ADA:'ADAUSDT',   AVAX:'AVAXUSDT',
  DOGE:'DOGEUSDT', TRX:'TRXUSDT',   TON:'TONUSDT',   MATIC:'MATICUSDT',
  DOT:'DOTUSDT',   LINK:'LINKUSDT', SHIB:'SHIBUSDT', LTC:'LTCUSDT',
  BCH:'BCHUSDT',   UNI:'UNIUSDT',   ATOM:'ATOMUSDT', XLM:'XLMUSDT',
  ETC:'ETCUSDT',   FIL:'FILUSDT',   NEAR:'NEARUSDT', ARB:'ARBUSDT',
  VET:'VETUSDT',   ALGO:'ALGOUSDT', HBAR:'HBARUSDT', OP:'OPUSDT',
  MKR:'MKRUSDT',   AAVE:'AAVEUSDT', GRT:'GRTUSDT',   INJ:'INJUSDT',
  IMX:'IMXUSDT',   RUNE:'RUNEUSDT', FTM:'FTMUSDT',   SAND:'SANDUSDT',
  MANA:'MANAUSDT', AXS:'AXSUSDT',   THETA:'THETAUSDT',XTZ:'XTZUSDT',
  EOS:'EOSUSDT',   CHZ:'CHZUSDT',   GALA:'GALAUSDT', APT:'APTUSDT',
  SUI:'SUIUSDT',   CRV:'CRVUSDT',   SNX:'SNXUSDT',   LDO:'LDOUSDT',
  WLD:'WLDUSDT',   SEI:'SEIUSDT',   TIA:'TIAUSDT',   PEPE:'PEPEUSDT',
  FLOKI:'FLOKIUSDT',WIF:'WIFUSDT',  BONK:'BONKUSDT', JUP:'JUPUSDT',
  PYTH:'PYTHUSDT', JTO:'JTOUSDT',   ONDO:'ONDOUSDT', STRK:'STRKUSDT',
  RENDER:'RENDERUSDT',FET:'FETUSDT',AGIX:'AGIXUSDT', OCEAN:'OCEANUSDT',
  KAS:'KASUSDT',   JASMY:'JASMYUSDT',BLUR:'BLURUSDT', '1INCH':'1INCHUSDT',
  DYDX:'DYDXUSDT', GMX:'GMXUSDT',   KAVA:'KAVAUSDT', FLOW:'FLOWUSDT',
  EGLD:'EGLDUSDT', ICP:'ICPUSDT',   STX:'STXUSDT',   MINA:'MINAUSDT',
  ROSE:'ROSEUSDT', ZIL:'ZILUSDT',   BAT:'BATUSDT',   ICX:'ICXUSDT',
  ZRX:'ZRXUSDT',   BAL:'BALUSDT',   COMP:'COMPUSDT', SUSHI:'SUSHIUSDT',
  CAKE:'CAKEUSDT', ENS:'ENSUSDT',   RPL:'RPLUSDT',   SSV:'SSVUSDT',
  API3:'API3USDT', ARKM:'ARKMUSDT', ZETA:'ZETAUSDT', DYM:'DYMUSDT',
  NTRN:'NTRNUSDT', MANTA:'MANTAUSDT',
};

// CoinGecko IDs map (untuk fetch harga real-time)
const COINGECKO_IDS = {
  BTC:'bitcoin',          ETH:'ethereum',           BNB:'binancecoin',
  SOL:'solana',           XRP:'ripple',             USDC:'usd-coin',
  ADA:'cardano',          AVAX:'avalanche-2',        DOGE:'dogecoin',
  TRX:'tron',             TON:'the-open-network',    MATIC:'matic-network',
  DOT:'polkadot',         LINK:'chainlink',          SHIB:'shiba-inu',
  LTC:'litecoin',         BCH:'bitcoin-cash',        UNI:'uniswap',
  ATOM:'cosmos',          XLM:'stellar',             ETC:'ethereum-classic',
  FIL:'filecoin',         NEAR:'near',               ARB:'arbitrum',
  VET:'vechain',          ALGO:'algorand',           HBAR:'hedera-hashgraph',
  OP:'optimism',          MKR:'maker',               AAVE:'aave',
  GRT:'the-graph',        INJ:'injective-protocol',  IMX:'immutable-x',
  RUNE:'thorchain',       FTM:'fantom',              SAND:'the-sandbox',
  MANA:'decentraland',    AXS:'axie-infinity',       THETA:'theta-token',
  XTZ:'tezos',            EOS:'eos',                 CHZ:'chiliz',
  GALA:'gala',            APT:'aptos',               SUI:'sui',
  CRV:'curve-dao-token',  SNX:'havven',              LDO:'lido-dao',
  WLD:'worldcoin-wld',    SEI:'sei-network',         TIA:'celestia',
  PEPE:'pepe',            FLOKI:'floki',             WIF:'dogwifcoin',
  BONK:'bonk',            JUP:'jupiter-exchange-solana', PYTH:'pyth-network',
  JTO:'jito-governance-token', ONDO:'ondo-finance',  STRK:'starknet',
  RENDER:'render-token',  FET:'fetch-ai',            AGIX:'singularitynet',
  OCEAN:'ocean-protocol', KAS:'kaspa',               JASMY:'jasmycoin',
  BLUR:'blur',            '1INCH':'1inch',            DYDX:'dydx',
  GMX:'gmx',              KAVA:'kava',               FLOW:'flow',
  EGLD:'elrond-erd-2',    ICP:'internet-computer',   STX:'blockstack',
  MINA:'mina-protocol',   ROSE:'oasis-network',      ZIL:'zilliqa',
  BAT:'basic-attention-token', ICX:'icon',           ZRX:'0x',
  BAL:'balancer',         COMP:'compound-governance-token',
  SUSHI:'sushi',          CAKE:'pancakeswap-token',  ENS:'ethereum-name-service',
  RPL:'rocket-pool',      SSV:'ssv-network',         DYDX:'dydx',
  ARKM:'arkham',
};

// ── Real Price Fetcher ────────────────────────────────────────────────────
// Gunakan Binance sebagai sumber utama (CORS-friendly, no rate limit issue)
// CoinGecko sebagai fallback untuk coin yang tidak ada di Binance
let _priceLastFetch   = 0;
let _priceFetchBusy   = false;
let _binancePriceFail = 0;

async function fetchRealPrices() {
  const now = Date.now();
  // Throttle: min 60 detik antar fetch
  if (_priceFetchBusy || now - _priceLastFetch < 60000) return;
  _priceFetchBusy = true;

  try {
    // Fetch semua ticker dari Binance (1 request = semua harga USDT pairs)
    const url = 'https://api.binance.com/api/v3/ticker/24hr';
    const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('Binance HTTP ' + res.status);
    const tickers = await res.json();

    // Build lookup map
    const map = {};
    tickers.forEach(t => { map[t.symbol] = t; });

    // Update COINS array
    let updated = 0;
    COINS.forEach(coin => {
      const sym = BINANCE_SYMBOL_MAP[coin.id];
      if (!sym || !map[sym]) return;
      const t = map[sym];
      const p = parseFloat(t.lastPrice);
      if (p > 0) {
        coin.price  = p;
        coin.change = parseFloat(parseFloat(t.priceChangePercent).toFixed(2));
        const vol = parseFloat(t.quoteVolume);
        if (vol > 0) coin.vol = '$' + _fmtVolShort(vol);
        updated++;
      }
    });

    _priceLastFetch = Date.now();
    _binancePriceFail = 0;
    console.log('[CryptoX] Prices updated from Binance for', updated, 'coins');

  } catch(e) {
    _binancePriceFail++;
    console.warn('[CryptoX] Binance price fetch failed:', e.message);
    // Hanya fallback ke CoinGecko jika Binance gagal 2x berturut-turut
    // dan tidak dipanggil dalam 5 menit terakhir dari index page
    if (_binancePriceFail >= 2) {
      _fetchCoinGeckoFallback();
    } else {
      _applyLocalFluctuation();
    }
  } finally {
    _priceFetchBusy = false;
  }
}

// CoinGecko sebagai fallback (hanya top 20 untuk hindari rate limit)
let _geckoLastFetch = 0;
async function _fetchCoinGeckoFallback() {
  const now = Date.now();
  if (now - _geckoLastFetch < 300000) { // max sekali per 5 menit
    _applyLocalFluctuation();
    return;
  }
  _geckoLastFetch = now;
  try {
    // Hanya fetch top 20 coins untuk menghindari CORS dan 429
    const top20 = ['bitcoin','ethereum','binancecoin','solana','ripple',
      'cardano','avalanche-2','dogecoin','tron','matic-network',
      'polkadot','chainlink','litecoin','uniswap','cosmos',
      'stellar','near','arbitrum','the-open-network','shiba-inu'].join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${top20}&vs_currencies=usd&include_24hr_change=true`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('CoinGecko HTTP ' + res.status);
    const data = await res.json();
    COINS.forEach(coin => {
      const gid = COINGECKO_IDS[coin.id];
      if (!gid || !data[gid]) return;
      if (data[gid].usd)              coin.price  = data[gid].usd;
      if (data[gid].usd_24h_change)   coin.change = parseFloat(data[gid].usd_24h_change.toFixed(2));
    });
    _priceLastFetch = Date.now();
    console.log('[CryptoX] Fallback prices from CoinGecko (top 20)');
  } catch(e) {
    console.warn('[CryptoX] CoinGecko fallback failed:', e.message);
    _applyLocalFluctuation();
  }
}

function _applyLocalFluctuation() {
  COINS.forEach(c => {
    c.price  = parseFloat((c.price  * (1 + (Math.random() - 0.5) * 0.0008)).toFixed(c.price > 100 ? 2 : 8));
    c.change = parseFloat((c.change + (Math.random() - 0.5) * 0.04).toFixed(2));
  });
}

function _fmtVolShort(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  return n.toLocaleString();
}

// Fetch harga real saat load, lalu setiap 2 menit (Binance tidak ada rate limit masalah)
fetchRealPrices();
setInterval(fetchRealPrices, 120000); // 2 menit sekali dari Binance

// Micro-fluctuation setiap 2 detik hanya untuk animasi "live" di UI
// Tidak hit API sama sekali
setInterval(_applyLocalFluctuation, 2000);

// ── Helpers ───────────────────────────────────────────────────────────────
const TRADING_PAIRS = COINS.map(c => ({
  pair:  c.id + '/USDT',
  base:  c.id,
  quote: 'USDT',
  price: c.price,
  change: c.change,
  vol:   c.vol,
  high:  parseFloat((c.price * 1.035).toFixed(c.price > 100 ? 2 : 8)),
  low:   parseFloat((c.price * 0.965).toFixed(c.price > 100 ? 2 : 8)),
}));

function getLivePrice(base) {
  const coin = COINS.find(c => c.id === base);
  if (!coin) return 0;
  return parseFloat((coin.price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(coin.price > 100 ? 2 : 8));
}

function fmt(price) {
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  if (price >= 1000)  return price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  if (price >= 1)     return price.toFixed(4);
  if (price >= 0.001) return price.toFixed(6);
  return price.toFixed(10);
}

function formatPrice(price) { return '$' + fmt(price); }

function formatVolume(vol) {
  if (typeof vol === 'string') return vol;
  return '$' + _fmtVolShort(vol);
}

function formatNumber(n, decimals = 2) {
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits:decimals, maximumFractionDigits:decimals });
}

function timeSince(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)    return s + 's ago';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function formatTime(ms)     { return new Date(ms).toLocaleTimeString('en-US', { hour12:false }); }
function formatDateTime(ms) { return new Date(ms).toLocaleString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }

// ── Order Book Generator ──────────────────────────────────────────────────
function generateOrderBook(basePrice, levels = 15) {
  const asks = [], bids = [];
  const dp = basePrice > 100 ? 2 : basePrice > 1 ? 4 : 8;
  let ap = basePrice * 1.0001;
  let bp = basePrice * 0.9999;
  for (let i = 0; i < levels; i++) {
    const aAmt = parseFloat((Math.random() * 2 + 0.01).toFixed(4));
    const bAmt = parseFloat((Math.random() * 2 + 0.01).toFixed(4));
    asks.push({ price: parseFloat(ap.toFixed(dp)), amount: aAmt, total: parseFloat((ap * aAmt).toFixed(2)) });
    bids.push({ price: parseFloat(bp.toFixed(dp)), amount: bAmt, total: parseFloat((bp * bAmt).toFixed(2)) });
    ap *= 1.0003;
    bp *= 0.9997;
  }
  return { asks: asks.sort((a, b) => a.price - b.price), bids: bids.sort((a, b) => b.price - a.price) };
}

// ── Recent Trades Generator ───────────────────────────────────────────────
function generateRecentTrades(basePrice, count = 30) {
  const trades = [];
  const dp = basePrice > 100 ? 2 : basePrice > 1 ? 4 : 8;
  for (let i = 0; i < count; i++) {
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const p = parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(dp));
    const a = parseFloat((Math.random() * 1.5 + 0.001).toFixed(4));
    trades.push({ price: p, amount: a, side, time: Date.now() - i * 3000 });
  }
  return trades;
}

// ── Candle Generator ─────────────────────────────────────────────────────
function generateCandles(basePrice, count = 100) {
  const candles = [];
  const dp = basePrice > 100 ? 2 : basePrice > 1 ? 4 : 8;
  let price = basePrice * 0.9;
  for (let i = 0; i < count; i++) {
    const open  = price;
    const close = parseFloat((open * (1 + (Math.random() - 0.48) * 0.015)).toFixed(dp));
    const high  = parseFloat((Math.max(open, close) * (1 + Math.random() * 0.008)).toFixed(dp));
    const low   = parseFloat((Math.min(open, close) * (1 - Math.random() * 0.008)).toFixed(dp));
    const vol   = parseFloat((Math.random() * 500 + 50).toFixed(2));
    candles.push({ open, high, low, close, vol, time: Date.now() - (count - i) * 15 * 60 * 1000 });
    price = close;
  }
  return candles;
}

// ── Default Balances ──────────────────────────────────────────────────────
function getDefaultBalances() {
  return {
    USDT: { available: 10000, in_order: 0 },
    BTC:  { available: 0,     in_order: 0 },
    ETH:  { available: 0,     in_order: 0 },
    BNB:  { available: 0,     in_order: 0 },
    SOL:  { available: 0,     in_order: 0 },
    XRP:  { available: 0,     in_order: 0 },
  };
}

// ── Random TxID ───────────────────────────────────────────────────────────
function randomTxId() {
  return '0x' + Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

// ── Watchlist ─────────────────────────────────────────────────────────────
function getWatchlist()    { return JSON.parse(localStorage.getItem('cx_watchlist') || '[]'); }
function toggleWatchlist(coinId) {
  const list = getWatchlist();
  const idx  = list.indexOf(coinId);
  if (idx > -1) list.splice(idx, 1); else list.push(coinId);
  localStorage.setItem('cx_watchlist', JSON.stringify(list));
  return list.includes(coinId);
}
function isWatched(coinId) { return getWatchlist().includes(coinId); }
