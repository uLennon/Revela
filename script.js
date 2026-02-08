import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const $ = (id) => document.getElementById(id);

const SUPABASE_URL = "https://menjfaztfkabogifyhua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_W-2790dCEiXvBZBc1LvXdQ_4jfJXWi4";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);



function getCookie(name) {
  const match = document.cookie.match(new RegExp(name + "=([^;]+)"));
  return match ? match[1] : null;
}

function setCookie(name, value, days = 1) {
  document.cookie =
    `${name}=${value}; path=/; max-age=${days * 86400}; SameSite=None; Secure`;
}


let marketOpen = true;

function setLive(text, open) {
  $("liveTxt").textContent = text;

  const color = open ? "rgba(34,197,94,.95)" : "rgba(245,158,11,.95)";
  const glow = open ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)";

  ["dot", "sDot"].forEach(id => {
    $(id).style.background = color;
    $(id).style.boxShadow = `0 0 0 3px ${glow}`;
  });
}



function render(state) {
  if (!state) return;

  marketOpen = state.marketOpen;

  $("v1").textContent = state.menino;
  $("vx").textContent = state.empate;
  $("v2").textContent = state.menina;

  $("o1").textContent = Number(state.o1).toFixed(2);
  $("ox").textContent = Number(state.ox).toFixed(2);
  $("o2").textContent = Number(state.o2).toFixed(2);

  const session = getCookie("vote_session");
  const canVote = marketOpen && !!session;

  ["bet1", "betx", "bet2"].forEach(id => {
    $(id).disabled = !canVote;
  });

  if (!session) {
    setLive("SEM SESSÃO", false);
    $("statusTxt").textContent = "❌ Sessão inválida.";
  } else if (!marketOpen) {
    setLive("MERCADO FECHADO", false);
    $("statusTxt").textContent = "Mercado encerrado.";
  } else {
    setLive("AO VIVO", true);
    $("statusTxt").textContent = "🟢 Pronto para votar.";
  }
}


async function loadMarket() {
  try {
    const { data, error } = await supabase
      .from("market_state")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) throw error;

    render(data);

  } catch (err) {
    console.error(err);
    setLive("OFFLINE", false);
    $("statusTxt").textContent = "🔴 Backend offline.";
  }
}



async function vote(pick) {
  if (localStorage.getItem("jaVotou")) {
    $("statusTxt").textContent = "❌ Você já votou.";
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "vote-handler",
      {
        body: { pick }
      }
    );

    if (error) throw error;

    // ─── MARCA QUE JÁ VOTOU ────────────
    localStorage.setItem("jaVotou", "true");

    $("statusTxt").textContent = "✅ Voto registrado!";

    ["bet1", "betx", "bet2"].forEach(id => {
      $(id).disabled = true;
    });

  } catch {
    $("statusTxt").textContent = "❌ Erro ao votar.";
  }
}


$("bet1").onclick = () => vote("1");
$("betx").onclick = () => vote("x");
$("bet2").onclick = () => vote("2");

loadMarket();



supabase
  .channel("market_state_live")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "market_state",
      filter: "id=eq.1",
    },
    (payload) => render(payload.new)
  )
  .subscribe();


const countdownId = 1;

async function iniciarCountdown() {
  const { data, error } = await supabase
    .from('countdown')
    .select('termina_em')
    .eq('id', countdownId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  const fim = new Date(data.termina_em);

  const timer = setInterval(async () => {
    const agora = new Date();
    const restante = fim - agora;

    if (restante > 0) {
      const segundos = Math.floor((restante / 1000) % 60);
      const minutos = Math.floor((restante / 1000 / 60) % 60);
      const horas = Math.floor((restante / 1000 / 60 / 60));

      $("contador").textContent =
        `${horas.toString().padStart(2,'0')}:` +
        `${minutos.toString().padStart(2,'0')}:` +
        `${segundos.toString().padStart(2,'0')}`;

    } else {
      clearInterval(timer);
      $("contador").style.display = 'none';

      const { data: msgData } = await supabase
        .from('countdown_publico')
        .select('mensagem')
        .eq('id', countdownId)
        .maybeSingle();

      if (msgData) {
        const msgDiv = $("mensagem");
        msgDiv.textContent = msgData.mensagem;
        msgDiv.style.display = 'block';
      }
    }
  }, 1000);
}

iniciarCountdown();
