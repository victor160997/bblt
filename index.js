const puppeteer = require("puppeteer");

// Configurações do bot
const URL = "https://blaze.com/pt/games/double";
const APOSTA_VALOR = "0.1"; // Valor da aposta como string
const CORES = [
  { nome: "branco", seletor: "div.white", valor: "0.1" },
];

async function applyFirstStrategy(converted) {
  if (converted.length < 1) return;

  const lastResult = converted[0];

  if (lastResult.color !== "white") return;

  const lastHour = new Date(lastResult["created_at"]);
  lastHour.setHours(lastHour.getHours() - 1, lastHour.getMinutes(), 1);
  const isoLastHour = lastHour.toISOString();

  const now = new Date();
  const isoNow = now.toISOString();
  const endpoint = `https://blaze.ac/api/roulette_games/history?startDate=${isoLastHour}&endDate=${isoNow}&page=1`;
  const res = await fetch(endpoint);
  const resFormatted = await res.json();

  const values = resFormatted.records.map((x) => {
    if (x.color === "red") return 1;

    if (x.color === "black") return 2;

    return 0;
  });
  const valueBet = values[0];

  if (valueBet === 0) return;

  const betTime = new Date(lastResult["created_at"]);
  betTime.setMinutes(betTime.getMinutes() + 10, 0);

  CORES.push({ nome: valueBet === 1 ? "red" : "black", seletor: valueBet === 1 ? "div.red" : "div.black", valor: "0.1", when: betTime });
}

async function fetchData() {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 2);
  const formattedStartDate = startDate.toISOString();
  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 1);
  const formattedEndDate = endDate.toISOString();
  const endpoint = `https://blaze.ac/api/roulette_games/history?startDate=${formattedStartDate}&endDate=${formattedEndDate}&page=1`;
  console.log(endpoint);
  const res = await fetch(endpoint);

  const converted = await res.json();

  applyFirstStrategy(converted);
}

// Função para realizar a aposta
async function apostar(page, cor) {
  // Seleciona o campo de input pelo seletor correto
  const inputSelector = "input.input-field";
  await page.waitForSelector(inputSelector);

  // Limpa o campo de input e digita o valor da aposta
  await page.evaluate((inputSelector) => {
    if (document.querySelector(inputSelector)?.value)
      document.querySelector(inputSelector).value = "";
  }, inputSelector);
  await new Promise((resolve) => setTimeout(resolve, 500));

  await page.type(inputSelector, cor.valor);

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Clica no botão de aposta da cor especificada
  await page.click(cor.seletor);
  console.log(`Apostado ${cor.valor} no ${cor.nome}`);

  const confirmarSelector = "button.shared-button-custom.css-1apb7jj";
  await page.waitForSelector(confirmarSelector);
  await page.click(confirmarSelector);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Aposta confirmada.");
  CORES = CORES.filter((c) => c.when !== cor.when);
}

// Função principal
async function startBot() {
  const confirmarSelector = "button.shared-button-custom.css-1apb7jj";
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(URL);

  // Aguarde o carregamento da página e faça login se necessário
  await page.waitForSelector("input.input-field");

  // Loop contínuo para fazer apostas a cada rodada
  while (true) {
    const inputSelector = "input.input-field";
    await page.waitForFunction(
      (selector, notExpectedText) => {
        const button = document.querySelector(selector);
        return button && !button.innerText.includes(notExpectedText);
      },
      {},
      confirmarSelector,
      "Esperando"
    );

    await page.evaluate((inputSelector) => {
      document.querySelector(inputSelector).value = "";
    }, inputSelector);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await fetchData();

    for (let cor of CORES) {
      const now = new Date();
      const isSameMinute = now.getMinutes() === cor.when.getMinutes();
      if (isSameMinute) {
        await apostar(page, cor);
      }
    }

    await page.evaluate((inputSelector) => {
      if (document.querySelector(inputSelector)?.value)
        document.querySelector(inputSelector).value = "";
    }, inputSelector);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await page.waitForFunction(
      (selector, expectedText) => {
        const button = document.querySelector(selector);
        return button && button.innerText.includes(expectedText);
      },
      {},
      confirmarSelector,
      "Esperando"
    );

    // Aguarde até a próxima rodada (ajuste o tempo conforme necessário)
    // await new Promise((resolve) => setTimeout(resolve, 20000)); // Espera 60 segundos
  }
}

// Iniciar o bot
startBot().catch(console.error);
