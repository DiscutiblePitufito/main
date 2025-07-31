document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM completamente cargado");
    
    // --- Firebase Configuración e Inicialización ---
    const firebaseConfig = {
        apiKey: "AIzaSyD9nY7ThYNay-B7HBA9o80nom4JAbbJL2E",
        authDomain: "blog-da6fd.firebaseapp.com",
        projectId: "blog-da6fd",
        storageBucket: "blog-da6fd.firebasestorage.app",
        messagingSenderId: "927265338035",
        appId: "1:927265338035:web:53a52854759a8dd3b576c6"
    };
    
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase inicializado correctamente");
    } catch (error) {
        console.error("Error inicializando Firebase:", error);
    }
    
    const db = firebase.firestore();
    console.log("Firestore inicializado");

    // --- Configuración de administrador y variables globales ---
    const ADMIN_USERNAME = "admin";
    const ADMIN_PASSWORD = "admin123";
    let currentUser = null;
    let currentTab = 'visual';
    let posts = [];
    let unsubscribe = null;

    // --- Elementos del DOM ---
    const postsContainer = document.getElementById('posts-container');
    const loginBtn = document.getElementById('login-btn');
    const loginWindow = document.getElementById('login-window');
    const closeLoginBtn = document.getElementById('close-login');
    const doLoginBtn = document.getElementById('do-login');
    const editorWindow = document.getElementById('editor-window');
    const closeEditorBtn = document.getElementById('close-editor');
    const newPostBtn = document.getElementById('new-post-btn');
    const savePostBtn = document.getElementById('save-post');
    const cancelPostBtn = document.getElementById('cancel-post');
    const deletePostBtn = document.getElementById('delete-post');
    const postId = document.getElementById('post-id');
    
    // Elementos de formulario de login
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');

    console.log("Elementos del DOM cargados:", {
        loginBtn, loginWindow, doLoginBtn
    });

    // --- Estado inicial de la interfaz ---
    if (!currentUser) {
        newPostBtn.style.display = 'none';
    }

    // --- Suscripción a Firestore para obtener posts en tiempo real ---
    function subscribeToPosts() {
        console.log("Iniciando suscripción a posts...");
        unsubscribe = db.collection('posts').orderBy('date', 'desc').onSnapshot(snapshot => {
            console.log("Nueva actualización de posts recibida");
            posts = [];
            snapshot.forEach(doc => {
                const post = doc.data();
                post.id = doc.id;
                // Asegurarse que date sea un objeto Date
                if (post.date && typeof post.date.toDate === 'function') {
                    post.date = post.date.toDate();
                } else if (typeof post.date === 'string') {
                    post.date = new Date(post.date);
                } else {
                    post.date = new Date();
                }
                posts.push(post);
            });
            renderPosts();
        }, error => {
            console.error("Error cargando posts:", error);
            postsContainer.innerHTML = '<div class="loading">Error cargando posts. Recargue la página.</div>';
        });
    }
    
    // Iniciar la suscripción
    subscribeToPosts();

    // --- Event listeners principales ---
    loginBtn.addEventListener('click', () => {
        console.log("Botón Login clickeado");
        if (currentUser === ADMIN_USERNAME) {
            logout();
        } else {
            loginWindow.style.display = 'block';
            // Enfocar el campo de usuario al abrir
            loginUsername.focus();
        }
    });

    closeLoginBtn.addEventListener('click', () => {
        console.log("Cerrando ventana de login");
        loginWindow.style.display = 'none';
    });
    
    closeEditorBtn.addEventListener('click', () => {
        console.log("Cerrando editor");
        editorWindow.style.display = 'none';
    });
    
    newPostBtn.addEventListener('click', openNewPostEditor);
    savePostBtn.addEventListener('click', savePost);
    cancelPostBtn.addEventListener('click', () => {
        console.log("Cancelando edición");
        editorWindow.style.display = 'none';
    });
    
    deletePostBtn.addEventListener('click', deletePost);

    doLoginBtn.addEventListener('click', function() {
        console.log("Intento de login");
        const username = loginUsername.value;
        const password = loginPassword.value;
        
        console.log(`Credenciales: ${username}/${password}`);
        
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            currentUser = ADMIN_USERNAME;
            loginWindow.style.display = 'none';
            loginBtn.textContent = 'Logout Admin';
            newPostBtn.style.display = 'block'; 
            renderPosts();
            alert('Sesión iniciada como administrador');
            
            // Limpiar campos de login
            loginUsername.value = '';
            loginPassword.value = '';
        } else {
            alert('Credenciales incorrectas');
            // Resaltar campos incorrectos
            loginUsername.style.borderColor = 'red';
            loginPassword.style.borderColor = 'red';
            setTimeout(() => {
                loginUsername.style.borderColor = '';
                loginPassword.style.borderColor = '';
            }, 2000);
        }
    });

    // Permitir cerrar ventanas con ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (loginWindow.style.display === 'block') {
                loginWindow.style.display = 'none';
            }
            if (editorWindow.style.display === 'block') {
                editorWindow.style.display = 'none';
            }
        }
    });

    // --- Event listeners para pestañas del editor ---
    document.querySelectorAll('.xp-tab-button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.xp-tab-button').forEach(btn => 
                btn.classList.remove('active'));
            document.querySelectorAll('.xp-tab-content').forEach(content => 
                content.classList.remove('active'));
            
            this.classList.add('active');
            currentTab = this.getAttribute('data-tab');
            document.getElementById(`${currentTab}-tab`).classList.add('active');
            
            syncTabs();
        });
    });

    // --- Funciones principales ---
    function logout() {
        console.log("Cerrando sesión");
        currentUser = null;
        loginBtn.textContent = 'Login Admin';
        newPostBtn.style.display = 'none';
        renderPosts();
    }

    function syncTabs() {
        // Sincronizar título
        const titleVisual = document.getElementById('post-title').value;
        const titleHtml = document.getElementById('post-title-html');
        if (currentTab === 'visual') {
            titleHtml.value = titleVisual;
        } else {
            document.getElementById('post-title').value = titleHtml.value;
        }
        
        // Sincronizar autor
        const authorVisual = document.getElementById('post-author').value;
        const authorHtml = document.getElementById('post-author-html');
        if (currentTab === 'visual') {
            authorHtml.value = authorVisual;
        } else {
            document.getElementById('post-author').value = authorHtml.value;
        }
        
        // Sincronizar imagen
        const imageVisual = document.getElementById('post-image').value;
        const imageHtml = document.getElementById('post-image-html');
        if (currentTab === 'visual') {
            imageHtml.value = imageVisual;
        } else {
            document.getElementById('post-image').value = imageHtml.value;
        }
    }

    function renderPosts() {
        console.log("Renderizando posts...");
        postsContainer.innerHTML = '';
        
        if (posts.length === 0) {
            postsContainer.innerHTML = '<div class="loading">No hay posts aún. ¡Sé el primero en crear uno!</div>';
            return;
        }
        
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'xp-post';
            
            const editButton = currentUser === ADMIN_USERNAME 
                ? `<button class="xp-button edit-post" data-id="${post.id}">Editar</button>`
                : '';
            
            let displayContent;
            if (post.isHtml) {
                displayContent = post.content;
            } else {
                // Convertir saltos de línea en <br> y mantener otro HTML
                displayContent = post.content
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>');
            }

            if (currentUser === ADMIN_USERNAME) {
                newPostBtn.style.display = 'block';
            } else {
                newPostBtn.style.display = 'none';
            }
            
            postElement.innerHTML = `
                <div class="xp-post-header">
                    <div>
                        <div class="xp-post-title">${post.title}</div>
                        <div class="xp-post-author">Por: ${post.author}</div>
                    </div>
                    <div class="xp-post-date">${formatDate(post.date)}</div>
                </div>
                ${post.imageUrl ? `
                <div class="xp-image-container ${post.imageAlignment || 'left'}">
                    <img src="${post.imageUrl}" alt="${post.title}" class="xp-post-image ${post.imageUrl.endsWith('.gif') ? 'gif' : ''}">
                </div>
                ` : ''}
                <div class="xp-post-content">${displayContent}</div>
                <div class="xp-post-actions">
                    ${editButton}
                </div>
            `;
            postsContainer.appendChild(postElement);
        });

        // Agregar event listeners a los botones de editar
        if (currentUser === ADMIN_USERNAME) {
            document.querySelectorAll('.edit-post').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    openEditPostEditor(id);
                });
            });
        }
    }

    function formatDate(date) {
        if (!(date instanceof Date)) {
            try {
                date = new Date(date);
            } catch (e) {
                date = new Date();
            }
        }
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function openNewPostEditor() {
        postId.value = '';
        document.getElementById('post-title').value = '';
        document.getElementById('post-title-html').value = '';
        document.getElementById('post-author').value = currentUser || '';
        document.getElementById('post-author-html').value = currentUser || '';
        document.getElementById('post-image').value = '';
        document.getElementById('post-image-html').value = '';
        document.getElementById('post-content').value = '';
        document.getElementById('post-html').value = '';
        document.querySelector('input[name="image-alignment"][value="left"]').checked = true;
        deletePostBtn.style.display = 'none';
        document.querySelector('[data-tab="visual"]').click();
        editorWindow.style.display = 'block';
    }

    function openEditPostEditor(id) {
        const post = posts.find(p => p.id === id);
        if (post) {
            postId.value = post.id;
            document.getElementById('post-title').value = post.title;
            document.getElementById('post-title-html').value = post.title;
            document.getElementById('post-author').value = post.author;
            document.getElementById('post-author-html').value = post.author;
            document.getElementById('post-image').value = post.imageUrl || '';
            document.getElementById('post-image-html').value = post.imageUrl || '';
            
            const alignment = post.imageAlignment || 'left';
            document.querySelector(`input[name="image-alignment"][value="${alignment}"]`).checked = true;
            
            if (post.isHtml) {
                document.getElementById('post-html').value = post.content;
                document.querySelector('[data-tab="html"]').click();
            } else {
                document.getElementById('post-content').value = post.content;
                document.querySelector('[data-tab="visual"]').click();
            }
            
            deletePostBtn.style.display = 'inline-block';
            editorWindow.style.display = 'block';
        }
    }

    function savePost() {
        const id = postId.value;
        let title, author, imageUrl, content;
        let isHtml = false;
        
        const imageAlignment = document.querySelector('input[name="image-alignment"]:checked').value;
        
        if (currentTab === 'html') {
            title = document.getElementById('post-title-html').value.trim();
            author = document.getElementById('post-author-html').value.trim();
            imageUrl = document.getElementById('post-image-html').value.trim();
            content = document.getElementById('post-html').value.trim();
            isHtml = true;
        } else {
            title = document.getElementById('post-title').value.trim();
            author = document.getElementById('post-author').value.trim();
            imageUrl = document.getElementById('post-image').value.trim();
            content = document.getElementById('post-content').value.trim();
            isHtml = false;
        }
        
        if (!title || !author) {
            alert('Por favor, completa al menos título y autor.');
            return;
        }
        
        const postData = {
            title,
            author,
            content,
            imageUrl,
            imageAlignment,
            isHtml,
            date: new Date()
        };
        
        if (id) {
            // Actualizar post existente
            db.collection('posts').doc(id).update(postData)
                .then(() => {
                    console.log("Post actualizado");
                    editorWindow.style.display = 'none';
                })
                .catch(error => {
                    console.error("Error actualizando post:", error);
                    alert("Error al actualizar el post");
                });
        } else {
            // Crear nuevo post
            db.collection('posts').add(postData)
                .then(() => {
                    console.log("Post creado");
                    editorWindow.style.display = 'none';
                })
                .catch(error => {
                    console.error("Error creando post:", error);
                    alert("Error al crear el post");
                });
        }
    }

    function deletePost() {
        const id = postId.value;
        if (confirm('¿Estás seguro de que quieres eliminar este post?')) {
            db.collection('posts').doc(id).delete()
                .then(() => {
                    console.log("Post eliminado");
                    editorWindow.style.display = 'none';
                })
                .catch(error => {
                    console.error("Error eliminando post:", error);
                    alert("Error al eliminar el post");
                });
        }
    }
});