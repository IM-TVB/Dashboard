const container = document.querySelector(".container");

const chatsContainer = document.querySelector(".chats-container");

const promptForm = document.querySelector(".prompt-form");

const promptInput = promptForm.querySelector(".prompt-input");

const fileInput = promptForm.querySelector("#file-input");

const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");

const themeToggleBtn = document.querySelector("#theme-toggle-btn");

const cancelFileBtn = document.querySelector("#cancel-file-btn");

const stopResponseBtn = document.querySelector("#stop-response-btn");

const deleteChatsBtn = document.querySelector("#delete-chats-btn");

const addFileBtn = promptForm.querySelector("#add-file-btn");

const promptWrapper = document.querySelector(".prompt-wrapper");

// API Setup

const API_KEY = "AIzaSyCoPqBJioO1DZbES-22-HWIGt5BEtZnOqw"; // Consider storing API keys more securely in production

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`; // Append API key here

let controller; // AbortController instance

let typingInterval; // Interval for typing effect

const chatHistory = [];

const userData = { message: "", file: {} };

// Set initial theme from local storage

const loadTheme = () => {

  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";

  document.body.classList.toggle("light-theme", isLightTheme);

  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

};

// Function to create message elements

const createMessageElement = (content, ...classes) => {

  const div = document.createElement("div");

  div.classList.add("message", ...classes);

  div.innerHTML = content;

  return div;

};

// Scroll to the bottom of the container

const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Simulate typing effect for bot responses

const typingEffect = (text, textElement, botMsgDiv) => {

  textElement.textContent = "";

  const words = text.split(" ");

  let wordIndex = 0;

  clearInterval(typingInterval); // Clear any existing interval

  typingInterval = setInterval(() => {

    if (wordIndex < words.length) {

      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];

      scrollToBottom();

    } else {

      clearInterval(typingInterval);

      botMsgDiv.classList.remove("loading");

      document.body.classList.remove("bot-responding");

    }

  }, 40);

};

// Make the API call and generate the bot's response

const generateResponse = async (botMsgDiv) => {

  const textElement = botMsgDiv.querySelector(".message-text");

  controller = new AbortController();

  chatHistory.push({

    role: "user",

    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],

  });

  try {

    const response = await fetch(API_URL, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ contents: chatHistory }),

      signal: controller.signal,

    });

    const data = await response.json();

    if (!response.ok) {

      const errorMessage = data.error?.message || "An unknown error occurred.";

      throw new Error(errorMessage);

    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\*\*([^*]+)\*\*/g, "$1").trim() || "No response text found.";

    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

  } catch (error) {

    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;

    textElement.style.color = "#d62939";

    botMsgDiv.classList.remove("loading");

    document.body.classList.remove("bot-responding");

    scrollToBottom();

  } finally {

    userData.file = {}; // Clear file data after response attempt

  }

};

// Handle the form submission

const handleFormSubmit = (e) => {

  e.preventDefault();

  const userMessage = promptInput.value.trim();

  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  userData.message = userMessage;

  promptInput.value = "";

  document.body.classList.add("chats-active", "bot-responding");

  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userMsgHTML = `

        <p class="message-text"></p>

        ${userData.file.data

            ? userData.file.isImage

                ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`

                : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`

            : ""

        }

    `;

  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");

  userMsgDiv.querySelector(".message-text").textContent = userData.message;

  chatsContainer.appendChild(userMsgDiv);

  scrollToBottom();

  setTimeout(() => {

    const botMsgHTML = `<img class="avatar" src="gemini.svg" /> <p class="message-text">Just a sec...</p>`;

    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");

    chatsContainer.appendChild(botMsgDiv);

    scrollToBottom();

    generateResponse(botMsgDiv);

  }, 600);

};

// Handle file input change (file upload)

const handleFileInputChange = () => {

  const file = fileInput.files[0];

  if (!file) return;

  const isImage = file.type.startsWith("image/");

  const reader = new FileReader();

  reader.readAsDataURL(file);

  reader.onload = (e) => {

    fileInput.value = ""; // Clear the file input for subsequent uploads

    const base64String = e.target.result.split(",")[1];

    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;

    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };

  };

};

// Cancel file upload

const cancelFileUpload = () => {

  userData.file = {};

  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  fileInput.value = ""; // Clear the file input

};

// Stop Bot Response

const stopBotResponse = () => {

  controller?.abort();

  userData.file = {};

  clearInterval(typingInterval);

  const loadingBotMessage = chatsContainer.querySelector(".bot-message.loading");

  if (loadingBotMessage) {

    loadingBotMessage.classList.remove("loading");

    loadingBotMessage.querySelector(".message-text").textContent = "Response generation stopped.";

    loadingBotMessage.querySelector(".message-text").style.color = "#d62939"; // Apply error color

  }

  document.body.classList.remove("bot-responding");

};

// Toggle dark/light theme

const toggleTheme = () => {

  const isLightTheme = document.body.classList.toggle("light-theme");

  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");

  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

};

// Delete all chats

const deleteAllChats = () => {

  chatHistory.length = 0;

  chatsContainer.innerHTML = "";

  document.body.classList.remove("chats-active", "bot-responding");

  userData.file = {}; // Clear any pending file data

  cancelFileUpload(); // Clear file upload wrapper if active

};

// Handle suggestions click

const handleSuggestionClick = (e) => {

  promptInput.value = e.currentTarget.querySelector(".text").textContent;

  promptForm.dispatchEvent(new Event("submit"));

};

// Show/hide controls for mobile on prompt input focus

const handleDocumentClick = ({ target }) => {

  const shouldHide = target.classList.contains("prompt-input") || (promptWrapper.classList.contains("hide-controls") && (target === addFileBtn || target === stopResponseBtn));

  promptWrapper.classList.toggle("hide-controls", shouldHide);

};

// Event Listeners

document.addEventListener("DOMContentLoaded", loadTheme); // Load theme on DOMContentLoaded

promptForm.addEventListener("submit", handleFormSubmit);

fileInput.addEventListener("change", handleFileInputChange);

cancelFileBtn.addEventListener("click", cancelFileUpload);

stopResponseBtn.addEventListener("click", stopBotResponse);

themeToggleBtn.addEventListener("click", toggleTheme);

deleteChatsBtn.addEventListener("click", deleteAllChats);

addFileBtn.addEventListener("click", () => fileInput.click());

document.querySelectorAll(".suggestions-item").forEach((suggestion) => {

  suggestion.addEventListener("click", handleSuggestionClick);

});

document.addEventListener("click", handleDocumentClick);