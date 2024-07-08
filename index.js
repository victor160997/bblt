const puppeteer = require("puppeteer");

// Configurações do bot
const URL = "https://blaze.com/pt/games/double";
const APOSTA_VALOR = "0.1"; // Valor da aposta como string

async function getNumberBet() {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 2);
  const formattedStartDate = startDate.toISOString();
  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 1);
  const formattedEndDate = endDate.toISOString();
  const endpoint = `https://blaze.ac/api/roulette_games/history?startDate=${formattedStartDate}&endDate=${formattedEndDate}&page=1`;
  console.log(endpoint)
  const res = await fetch(endpoint);

  const converted = await res.json();

  const values = converted.records.map((x) => {
    if (x.color === "red") return 1;

    if (x.color === "black") return 2;

    return 0;
  });

  const redPercentage = values.filter((x) => x === 1).length;
  const blackPercentage = values.filter((x) => x === 2).length;

  if (blackPercentage - redPercentage >= 3) return 1;
  if (redPercentage - blackPercentage >= 3) return 2;

  return null;
}

// Função para realizar a aposta
async function apostar(page, cor) {
  // Seleciona o campo de input pelo seletor correto
  const inputSelector = "input.input-field";
  await page.waitForSelector(inputSelector);

  // Limpa o campo de input e digita o valor da aposta
  await page.evaluate((inputSelector) => {
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
    await new Promise((resolve) => setTimeout(resolve, 100));

    const number = await getNumberBet();

    if (number) {
      const CORES = [
        {
          nome: number === 1 ? "vermelho" : "preto",
          seletor: number === 1 ? "div.red" : "div.black",
          valor: "1",
        },
        { nome: "branco", seletor: "div.white", valor: "0.25" },
      ];
      for (let cor of CORES) {
        await apostar(page, cor);
      }
    }

    await page.evaluate((inputSelector) => {
      document.querySelector(inputSelector).value = "";
    }, inputSelector);
    await new Promise((resolve) => setTimeout(resolve, 100));

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
