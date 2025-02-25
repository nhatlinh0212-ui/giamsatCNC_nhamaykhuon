let sortOrder = 'asc'; // Default sort order
let pollingInterval; // Variable to store the polling interval
let isPolling = true; // Variable to track polling state

function toggleSortOrder() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    listFiles();
}

function showAlert() {
    alert("Bạn đã nhấn vào nút!");
}

function showPasswordForm() {
    document.getElementById("password-form").style.display = "block";
}

function checkPassword() {
    const password = document.getElementById("password-input").value;
    if (password === "2002") {
        document.getElementById("password-form").style.display = "none";
        document.getElementById("content").style.display = "block";
        listFiles(); // Call listFiles when the password is correct
        startPolling(); // Start polling for file changes
    } else {
        alert("Mật khẩu không đúng!");
    }
}

function updateMachineStats() {
    const fileList = document.getElementById("file-list");
    const rows = Array.from(fileList.children);
    const totalMachines = rows.length;
    const activeMachines = rows.filter(row => row.querySelector(".status").innerText.includes("🟢")).length;
    const inactiveMachines = rows.filter(row => row.querySelector(".status").innerText.includes("🟡")).length;
    const alertMachines = rows.filter(row => row.querySelector(".status").innerText.includes("🔴")).length;
    const shutdownMachines = rows.filter(row => row.querySelector(".status").innerText.includes("🟦")).length;

    document.getElementById("total-machines").innerText = totalMachines;
    document.getElementById("active-machines").innerText = activeMachines;
    document.getElementById("inactive-machines").innerText = inactiveMachines;
    document.getElementById("alert-machines").innerText = alertMachines;
    document.getElementById("shutdown-machines").innerText = shutdownMachines;
}

async function listFiles() {
    const loadingIndicator = document.getElementById("loading-indicator");
    const progressBarFill = document.getElementById("progress-bar-fill");
    const progressBar = document.querySelector(".progress-bar");
    loadingIndicator.style.display = "block"; // Show loading indicator
    progressBar.style.display = "block"; // Show progress bar
    progressBarFill.style.width = "0%";
    progressBarFill.innerText = "0%";

    try {
        const response = await gapi.client.drive.files.list({
            'q': "'1VLnOPj2HBuTfjDp5RAheFOpNEjmqAdDD' in parents and mimeType='text/plain'",
            'fields': 'files(id, name)'
        });

        const files = response.result.files;
        const fileList = document.getElementById("file-list");
        const existingRows = new Set(Array.from(fileList.children).map(row => row.id));
        const newFiles = new Set(files.map(file => file.name.replace('.txt', '')));

        // Remove rows for files that no longer exist
        existingRows.forEach(fileName => {
            if (!newFiles.has(fileName)) {
                document.getElementById(fileName).remove();
            }
        });

        if (files && files.length > 0) {
            const totalFiles = files.length;
            let loadedFiles = 0;

            const fetchPromises = files.map(file => fetchFileData(file.id, file.name).then(() => {
                loadedFiles++;
                const progress = Math.round((loadedFiles / totalFiles) * 100);
                progressBarFill.style.width = progress + "%";
                progressBarFill.innerText = progress + "%";
            }));

            await Promise.all(fetchPromises);
            loadingIndicator.style.display = "none"; // Hide loading indicator
            progressBar.style.display = "none"; // Hide progress bar
            updateMachineStats(); // Update machine statistics
        } else {
            fileList.innerHTML = '<tr><td colspan="10">No files found.</td></tr>';
            updateMachineStats(); // Update machine statistics
        }
    } catch (error) {
        console.error("Error listing files:", error);
    }
}

async function fetchFileData(fileId, fileName) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const fileContent = response.body;
        const fileData = parseFileData(fileContent);
        updateTableRow(fileName.replace('.txt', ''), fileData); // Remove .txt extension
    } catch (error) {
        console.error("Error fetching file data:", error);
    }
}

function parseFileData(fileContent) {
    const lines = fileContent.split('\n');
    const data = {};
    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            data[key.trim()] = valueParts.join(':').trim();
        }
    });
    return data;
}

function updateTableRow(fileName, fileData) {
    const fileList = document.getElementById("file-list");
    let row = document.getElementById(fileName);

    if (!row) {
        row = document.createElement("tr");
        row.id = fileName;
        row.innerHTML = `
            <td class="file-name">${fileName}</td>
            <td class="status"></td>
            <td class="absolute-position"></td>
            <td class="relative-position"></td>
            <td class="time-run"></td>
            <td class="time-stop"></td>
            <td class="time-alert"></td>
            <td class="time-shutdown"></td>
            <td class="total-time-run"></td>
            <td class="total-time-stop"></td>
            <td class="total-time-alert"></td>
            <td class="total-time-shutdown"></td>
        `;
        fileList.appendChild(row);
    }

    const absolute_position = fileData["Vị trí truyệt đối của các trục (x, y, z)"] || "";
    const relative_position = fileData["Vị trí tương đối của trục (x, y, z)"] || "";
    const activity_status = fileData["Trạng thái hoạt động"] || "Không rõ";
    const status = activity_status === "Đang dừng" ? "🟡 Dừng hoạt động" :
                   activity_status === "Đang hoạt động" ? "🟢 Đang hoạt động" :
                   activity_status === "Cảnh báo" ? "🔴 Cảnh báo" :
                   activity_status === "Đã tắt" ? "🟦 Đã tắt" : "Không rõ";

    const time_run = fileData["Thời gian chạy"] || "00:00:00";
    const time_stop = fileData["Thời gian dừng"] || "00:00:00";
    const time_alert = fileData["Thời gian cảnh báo"] || "00:00:00";
    const time_shutdown = fileData["Thời gian tắt"] || "00:00:00";
    const total_time_run = fileData["Tổng thời gian chạy"] || "00:00:00";
    const total_time_stop = fileData["Tổng thời gian dừng"] || "00:00:00";
    const total_time_alert = fileData["Tổng thời gian cảnh báo"] || "00:00:00";
    const total_time_shutdown = fileData["Tổng thời gian tắt"] || "00:00:00";

    row.querySelector(".status").innerText = status;
    row.querySelector(".absolute-position").innerText = absolute_position;
    row.querySelector(".relative-position").innerText = relative_position;
    row.querySelector(".time-run").innerText = time_run;
    row.querySelector(".time-stop").innerText = time_stop;
    row.querySelector(".time-alert").innerText = time_alert;
    row.querySelector(".time-shutdown").innerText = time_shutdown;
    row.querySelector(".total-time-run").innerText = total_time_run;
    row.querySelector(".total-time-stop").innerText = total_time_stop;
    row.querySelector(".total-time-alert").innerText = total_time_alert;
    row.querySelector(".total-time-shutdown").innerText = total_time_shutdown;

    // Update icons after table row is updated
    addIconsToImage();
}

function initClient() {
    gapi.client.init({
        'apiKey': 'AIzaSyBjjnUx4Hu-xBMqNBeLllL1JJR9pl9lhac', // Replace with your actual API key
        'clientId': '1095891064471-6rnn7bkukmr2alr9vje7p1sbg6dunem9.apps.googleusercontent.com', // Replace with your actual client ID
        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        'scope': 'https://www.googleapis.com/auth/drive.readonly'
    }).then(function () {
        listFiles();
    });
}

function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

function startPolling() {
    pollingInterval = setInterval(listFiles, 5000); // Refresh the file list every 5 seconds
}

function stopPolling() {
    clearInterval(pollingInterval); // Stop the polling
}

function togglePolling() {
    const toggleButton = document.getElementById("toggle-button");
    if (isPolling) {
        stopPolling();
        toggleButton.innerHTML = '<img src="play.png" alt="Tiếp tục" style="width: 20px; height: 20px;">';
    } else {
        startPolling();
        toggleButton.innerHTML = '<img src="stop-button.png" alt="Dừng" style="width: 20px; height: 20px;">';
    }
    isPolling = !isPolling;
}





