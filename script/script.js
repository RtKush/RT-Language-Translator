
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

const dropdowns = document.querySelectorAll(".dropdown-container"),
  inputLanguageDropdown = document.querySelector("#input-language"),
  outputLanguageDropdown = document.querySelector("#output-language");

const inputCardTitle = document.querySelector("#input-card-title"),
  outputCardTitle = document.querySelector("#output-card-title");

// Get reference to the output div
const outputTextElem = document.querySelector("#output-text");

// --- Text Animation Function ---
function animateText(element, text) {
    element.innerHTML = ""; // Clear previous text
    const characters = text.split('');
    characters.forEach((char, index) => {
        const span = document.createElement("span");
        span.className = "char-animated";
        // Use non-breaking space for actual spaces to maintain layout
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.animationDelay = `${index * 0.02}s`;
        element.appendChild(span);
    });
}

function populateDropdown(dropdown, options) {
  dropdown.querySelector("ul").innerHTML = "";
  options.forEach((option) => {
    const li = document.createElement("li");
    const title = option.name + " (" + option.native + ")";
    li.innerHTML = title;
    li.dataset.value = option.code;
    li.classList.add("option");
    dropdown.querySelector("ul").appendChild(li);
  });
}

populateDropdown(inputLanguageDropdown, languages);
populateDropdown(outputLanguageDropdown, languages);

dropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector(".dropdown-toggle");

  toggle.addEventListener("click", () => {
    dropdown.classList.toggle("active");
  });

  dropdown.querySelectorAll(".option").forEach((item) => {
    item.addEventListener("click", (e) => {
      dropdown.querySelectorAll(".option").forEach((item) => {
        item.classList.remove("active");
      });
      item.classList.add("active");
      const selected = dropdown.querySelector(".selected");
      selected.innerHTML = item.innerHTML;
      selected.dataset.value = item.dataset.value;
      dropdown.classList.remove("active");
      updateCardTitles();
      translate();
    });
  });
});

document.addEventListener("click", (e) => {
  dropdowns.forEach((dropdown) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });
});

function updateCardTitles() {
  const inputLang = inputLanguageDropdown.querySelector(".selected").innerHTML;
  const outputLang = outputLanguageDropdown.querySelector(".selected").innerHTML;
  inputCardTitle.innerHTML = inputLang.split(" (")[0];
  outputCardTitle.innerHTML = outputLang.split(" (")[0];
}

const swapBtn = document.querySelector(".swap-position"),
  inputLanguage = inputLanguageDropdown.querySelector(".selected"),
  outputLanguage = outputLanguageDropdown.querySelector(".selected"),
  inputTextElem = document.querySelector("#input-text");

swapBtn.addEventListener("click", (e) => {
  const temp = inputLanguage.innerHTML;
  inputLanguage.innerHTML = outputLanguage.innerHTML;
  outputLanguage.innerHTML = temp;

  const tempValue = inputLanguage.dataset.value;
  inputLanguage.dataset.value = outputLanguage.dataset.value;
  outputLanguage.dataset.value = tempValue;

  // Swap text between textarea (input) and div (output)
  const tempInputText = inputTextElem.value;
  inputTextElem.value = outputTextElem.innerText;
  animateText(outputTextElem, tempInputText); // Animate the swapped text into the output

  updateCardTitles();
});

function translate() {
  const inputText = inputTextElem.value;
  const inputLangCode = "auto";
  const outputLangCode = outputLanguageDropdown.querySelector(".selected").dataset.value;

  if (!inputText.trim()) {
    outputTextElem.innerHTML = "";
    return;
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${inputLangCode}&tl=${outputLangCode}&dt=t&dt=rm&q=${encodeURI(
    inputText
  )}`;

  fetch(url)
    .then((response) => response.json())
    .then((json) => {
      if (json && json[0] && json[0][0] && json[0][0][0]) {
        const translatedText = json[0].map((item) => item[0]).join("");
        animateText(outputTextElem, translatedText); // Use the animation function
      } else {
        animateText(outputTextElem, "Translation not available.");
      }
    })
    .catch((error) => {
      console.log(error);
      animateText(outputTextElem, "Error: Could not translate.");
    });
}

const uploadDocument = document.querySelector("#upload-document"),
  uploadTitle = document.querySelector("#upload-title");

uploadDocument.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) { return; }
    
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    uploadTitle.innerHTML = "Reading file...";

    reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        let text = "";
        try {
            if (file.type === "application/pdf") {
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                const numPages = pdf.numPages;
                let pdfText = [];
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    pdfText.push(textContent.items.map(item => item.str).join(" "));
                }
                text = pdfText.join("\n\n");
            } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                text = result.value;
            } else if (file.type === "text/plain") {
                const textDecoder = new TextDecoder("utf-8");
                text = textDecoder.decode(arrayBuffer);
            } else {
                alert("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
                uploadTitle.innerHTML = "Choose File";
                return;
            }
            inputTextElem.value = text;
            uploadTitle.innerHTML = file.name;
            translate();
        } catch (error) {
            console.error("Error reading file:", error);
            alert("Sorry, there was an error processing your file.");
            uploadTitle.innerHTML = "Choose File";
        }
    };
    reader.onerror = () => {
        console.error("FileReader error");
        alert("Sorry, there was an error reading your file.");
        uploadTitle.innerHTML = "Choose File";
    };
});

const downloadBtn = document.querySelector("#download-btn");

downloadBtn.addEventListener("click", (e) => {
  // Get text from the output DIV using innerText
  const outputText = outputTextElem.innerText;
  const outputLanguage = outputLanguageDropdown.querySelector(".selected").dataset.value;
  if (outputText) {
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `translated-to-${outputLanguage}.txt`;
    a.href = url;
    a.click();
  }
});

const darkModeCheckbox = document.getElementById("dark-mode-btn");
darkModeCheckbox.addEventListener("change", () => {
  document.body.classList.toggle("dark");
});

const inputChars = document.querySelector("#input-chars");

inputTextElem.addEventListener("input", (e) => {
  inputChars.innerHTML = inputTextElem.value.length;
  if (inputTextElem.value.length > 5000) {
    inputTextElem.value = inputTextElem.value.slice(0, 5000);
  }
  translate();
});