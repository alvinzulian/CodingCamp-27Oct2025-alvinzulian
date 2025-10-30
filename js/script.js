document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil elemen HTML yang dibutuhkan
    const taskInput = document.getElementById('task-input');
    const dueDateInput = document.getElementById('due-date-input');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const filterBtn = document.getElementById('filter-btn');
    const deleteAllBtn = document.getElementById('delete-all-btn');

    // Elemen untuk Sorting dan Modal
    const sortHeaders = document.querySelectorAll('.sortable');
    const deleteModal = document.getElementById('delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const editModal = document.getElementById('edit-modal');
    const editTaskInput = document.getElementById('edit-task-input');
    const editDueDateInput = document.getElementById('edit-due-date-input');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');


    // State Aplikasi
    let tasks = [];
    let currentFilter = 'ALL';
    let sortState = { key: 'dueDate', direction: 'asc' };
    let currentEditingId = null; 


    // --- UTILITIES: Tanggal dan Toast (Membuat kode lebih rapi) ---

    // Mengambil tanggal hari ini dalam format YYYY-MM-DD
    function getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Memeriksa apakah tanggal valid (tidak di masa lalu)
    function isValidDate(dateString) {
        return dateString >= getTodayString();
    }

    function showToast(message) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.classList.add('toast-notification');
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // --- UTILITIES: Penyimpanan Data ---
    function saveTasks() {
        localStorage.setItem('todoTasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const savedTasks = localStorage.getItem('todoTasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
    }
    loadTasks();


    // --- Logika Pengurutan dan Tampilan ---
    function sortTasks(tasksArray) {
        const { key, direction } = sortState;

        tasksArray.sort((a, b) => {
            let valA = a[key];
            let valB = b[key];
            
            if (key === 'name') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            if (key === 'completed') {
                valA = a.completed ? 1 : 0;
                valB = b.completed ? 1 : 0;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return tasksArray;
    }

    function updateSortHeaderUI() {
        sortHeaders.forEach(header => {
            header.classList.remove('active-sort', 'asc', 'desc');
            if (header.getAttribute('data-sort-key') === sortState.key) {
                header.classList.add('active-sort', sortState.direction);
            }
        });
    }

    function renderTasks() {
        taskList.innerHTML = '';

        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'PENDING') return !task.completed;
            if (currentFilter === 'COMPLETED') return task.completed;
            return true;
        });

        const finalTasks = sortTasks(filteredTasks);
        const todayString = getTodayString(); // Panggil fungsi utilitas

        if (finalTasks.length === 0) {
            let message = "No task found";
            if (currentFilter === 'PENDING') message = "No pending task found";
            else if (currentFilter === 'COMPLETED') message = "No completed task found";
            
            const noTaskRow = document.createElement('tr');
            noTaskRow.innerHTML = `<td colspan="4" class="no-task-message">${message}</td>`;
            taskList.appendChild(noTaskRow);
            return;
        }

        // Menampilkan Daftar Tugas
        finalTasks.forEach((task) => {
            const isTaskOverdue = !task.completed && task.dueDate && task.dueDate < todayString;
            
            const statusText = task.completed ? 'Completed' : (isTaskOverdue ? 'OVERDUE' : 'Pending');
            const taskClass = task.completed ? 'completed-task' : (isTaskOverdue ? 'overdue-task-text' : '');

            const completeButtonText = task.completed ? 'Undo' : 'Complete';
            
            const row = document.createElement('tr');
            if (isTaskOverdue) row.classList.add('overdue-task-row');

            row.innerHTML = `
                <td class="${taskClass}">${task.name}</td>
                <td class="${taskClass}">${task.dueDate || '-'}</td>
                <td>${statusText}</td>
                <td>
                    <button class="action-btn edit-btn" data-id="${task.id}" ${task.completed ? 'disabled' : ''}>
                        Edit
                    </button>
                    <button class="action-btn complete-btn" data-id="${task.id}">
                        ${completeButtonText}
                    </button>
                    <button class="action-btn delete-btn" data-id="${task.id}">
                        Delete
                    </button>
                </td>
            `; 
            
            taskList.appendChild(row);
        });
        
        saveTasks();
        updateSortHeaderUI();
    }


    // --- Fungsionalitas CRUD Utama ---
    function addTask() {
        const taskName = taskInput.value.trim();
        const dueDate = dueDateInput.value;

        if (taskName === "") {
            showToast("⚠️ Nama tugas tidak boleh kosong!");
            return;
        }
        
        if (dueDate === "") {
            showToast("⚠️ Tanggal batas waktu tidak boleh kosong!");
            return;
        }

        // Gunakan fungsi utilitas untuk validasi tanggal
        if (!isValidDate(dueDate)) {
            showToast("⚠️ Tanggal batas waktu tidak boleh di masa lalu!");
            return;
        }

        const newTask = {
            id: Date.now().toString(),
            name: taskName,
            dueDate: dueDate,
            completed: false
        };

        tasks.push(newTask);
        
        taskInput.value = '';
        dueDateInput.value = '';
        
        renderTasks();
        showToast("✅ Tugas berhasil ditambahkan!");
    }
    
    // Logika Edit Modal
    function showEditModal(taskId) {
        const taskToEdit = tasks.find(t => t.id === taskId);
        if (!taskToEdit || taskToEdit.completed) {
            showToast("🔒 Tugas yang sudah selesai tidak dapat diedit.");
            return;
        }
        
        currentEditingId = taskId;
        editTaskInput.value = taskToEdit.name;
        editDueDateInput.value = taskToEdit.dueDate;

        editModal.classList.add('visible');
    }

    function hideEditModal() {
        editModal.classList.remove('visible');
        currentEditingId = null;
    }

    function handleSaveEdit() {
        const newName = editTaskInput.value.trim();
        const newDueDate = editDueDateInput.value;

        if (newName === "" || newDueDate === "") {
            showToast("⚠️ Nama tugas dan tanggal tidak boleh kosong!");
            return;
        }
        
        // Gunakan fungsi utilitas untuk validasi tanggal edit
        if (!isValidDate(newDueDate)) {
            showToast("⚠️ Tanggal batas waktu tidak boleh di masa lalu!");
            return;
        }

        const taskIndex = tasks.findIndex(t => t.id === currentEditingId);

        if (taskIndex !== -1) {
            const task = tasks[taskIndex];
            
            if (task.name !== newName || task.dueDate !== newDueDate) {
                task.name = newName;
                task.dueDate = newDueDate;
                renderTasks();
                showToast("✏️ Tugas berhasil diperbarui!");
            } else {
                 showToast("Tidak ada perubahan yang disimpan.");
            }
        }
        
        hideEditModal();
    }
    
    // Logika Filter
    function toggleFilter() {
        if (currentFilter === 'ALL') {
            currentFilter = 'PENDING';
            filterBtn.textContent = 'FILTER (Pending)';
        } else if (currentFilter === 'PENDING') {
            currentFilter = 'COMPLETED';
            filterBtn.textContent = 'FILTER (Completed)';
        } else {
            currentFilter = 'ALL';
            filterBtn.textContent = 'FILTER';
        }
        renderTasks();
    }
    
    // Logika Hapus Semua
    function showDeleteModal() {
        if (tasks.length === 0) return;
        deleteModal.classList.add('visible');
    }

    function hideDeleteModal() {
        deleteModal.classList.remove('visible');
    }
    
    function executeDeleteAllTasks() {
        tasks = [];
        currentFilter = 'ALL';
        filterBtn.textContent = 'FILTER';
        renderTasks();
        hideDeleteModal();
        showToast("🗑️ Semua tugas telah dihapus!");
    }


    // --- Event Listeners ---
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    filterBtn.addEventListener('click', toggleFilter);

    deleteAllBtn.addEventListener('click', showDeleteModal);
    
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    confirmDeleteBtn.addEventListener('click', executeDeleteAllTasks);
    
    cancelEditBtn.addEventListener('click', hideEditModal);
    saveEditBtn.addEventListener('click', handleSaveEdit);


    // Listener untuk Sorting
    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const key = header.getAttribute('data-sort-key');
            
            if (sortState.key === key) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.key = key;
                sortState.direction = 'asc';
            }
            renderTasks();
        });
    });


    // Delegasi Event untuk tombol Complete/Delete/Edit di dalam tabel
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('action-btn')) {
            const taskId = target.getAttribute('data-id');
            const taskIndex = tasks.findIndex(t => t.id === taskId);

            if (taskIndex === -1) return;

            if (target.classList.contains('complete-btn')) {
                tasks[taskIndex].completed = !tasks[taskIndex].completed;
                const status = tasks[taskIndex].completed ? "selesai" : "ditunda";
                showToast(`Status tugas diubah menjadi ${status}!`);
            } else if (target.classList.contains('delete-btn')) {
                tasks.splice(taskIndex, 1);
                showToast("❌ Tugas berhasil dihapus!");
            } else if (target.classList.contains('edit-btn')) { 
                if (target.hasAttribute('disabled')) {
                    showToast("🔒 Tugas yang sudah selesai tidak dapat diedit.");
                    return;
                }
                showEditModal(taskId);
                return; 
            }

            renderTasks();
        }
    });
    
    // Inisialisasi tampilan saat pertama kali dimuat
    renderTasks();
});