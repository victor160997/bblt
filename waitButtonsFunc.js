
export async function Wait(page) {
    const confirmarSelector = "button.shared-button-custom.css-1apb7jj";
    await page.waitForFunction(
        (selector, notExpectedText) => {
          const button = document.querySelector(selector);
          return button && !button.innerText.includes(notExpectedText);
        },
        {},
        confirmarSelector,
        "Esperando"
      );
}