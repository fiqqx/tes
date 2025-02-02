const messages = [
    "Yakin?????",
    "Sangat Yakin?????????",
    "ihhhh kok gitu:(((((",
    "Plisssssss bub:(",
    "cukup twww:(",
    "Sedih bangettttt:'(",
    "ohhhh begitu dihhhh",
    "iyaaaa paleeee anaknya cias",
    "disayang dong bub :) ❤️"
];

let messageIndex = 0;

function handleNoClick() {
    const noButton = document.querySelector('.no-button');
    const yesButton = document.querySelector('.yes-button');
    noButton.textContent = messages[messageIndex];
    messageIndex = (messageIndex + 1) % messages.length;
    const currentSize = parseFloat(window.getComputedStyle(yesButton).fontSize);
    yesButton.style.fontSize = `${currentSize * 1.5}px`;
}

function handleYesClick() {
    window.location.href = "yes_page.html";
}