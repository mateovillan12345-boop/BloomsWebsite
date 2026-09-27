// ==================== CONFIGURACIÓN ====================
// URL corregida con doble slash https://
const SUPABASE_URL = "https://fdcmuqvnrhkwvzrnioec.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hZ7hJnezf7_IkiakRMVvwQ_4-VQUSHc";

// Ingresa tu número de WhatsApp con código de país sin espacios ni guiones:
const NUMERO_WHATSAPP = "+59165598339"; 
// ========================================================

let carrito = [];
let productosData = [];

// Elementos DOM

const productContainer = document.getElementById('product-container');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartBadge = document.getElementById('cart-count');
const cartNavBadge = document.getElementById('cart-nav-badge');
const btnCheckout = document.getElementById('btn-checkout');
const openCartBtn = document.getElementById('floating-cart-btn');
const openCartNavBtn = document.getElementById('open-cart-nav');
const closeCartBtn = document.getElementById('cart-close');
const radioDeliveries = document.querySelectorAll('input[name="tipo_entrega"]');
const direccionField = document.getElementById('direccion-field');
const direccionInput = document.getElementById('direccion_input');
const fechaInput = document.getElementById('fecha_entrega');
const horaInput = document.getElementById('hora_entrega');
const notaInput = document.getElementById('nota_pedido');

// Restricción de fecha: mínimo hoy
if (fechaInput) {
  const hoy = new Date().toISOString().split('T')[0];
  fechaInput.min = hoy;
}

// Control de visibilidad campo Dirección según selección de Delivery / Recojo
radioDeliveries.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'Recojo en tienda') {
      direccionField.style.display = 'none';
    } else {
      direccionField.style.display = 'block';
    }
  });
});

// Apertura y cierre del carrito
function abrirCarrito() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
}
function cerrarCarrito() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
}

if (openCartBtn) openCartBtn.addEventListener('click', abrirCarrito);
if (openCartNavBtn) openCartNavBtn.addEventListener('click', abrirCarrito);
if (closeCartBtn) closeCartBtn.addEventListener('click', cerrarCarrito);
if (cartOverlay) cartOverlay.addEventListener('click', cerrarCarrito);

// Cargar productos de Supabase
async function fetchProductos() {
  const endpoint = `${SUPABASE_URL}/rest/v1/productos?select=*&order=created_at.desc`;
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    productosData = await response.json();
    renderProductos(productosData);
  } catch (error) {
    console.error("Error cargando productos de Supabase:", error);
    if (productContainer) {
      productContainer.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--rose);">
          <p>No se pudieron cargar los productos.</p>
          <button onclick="fetchProductos()" class="btn outline" style="margin-top: 15px;">Reintentar</button>
        </div>
      `;
    }
  }
}

// Renderizar tarjetas de catálogo
function renderProductos(lista) {
  if (!productContainer) return;
  if (!lista || lista.length === 0) {
    productContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No hay productos disponibles por ahora.</p>`;
    return;
  }

  productContainer.innerHTML = "";
  lista.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const precio = parseFloat(prod.precio).toFixed(2);

    card.innerHTML = `
      <div class="product-img-wrap">
        ${prod.tag ? `<span class="product-tag">${prod.tag}</span>` : ''}
        <img src="${prod.imagen_url}" alt="${prod.nombre}" loading="lazy">
        <div class="whatsapp-btn-container">
          <button class="product-add add-to-cart" data-id="${prod.id}" title="Agregar al pedido">
            +
          </button>
        </div>
      </div>
      <div class="product-info">
        <h3>${prod.nombre}</h3>
        <div class="product-price">Bs ${precio}</div>
      </div>
    `;
    productContainer.appendChild(card);
  });

  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      const producto = productosData.find(p => p.id == id);
      if (producto) agregarAlCarrito(producto);
    });
  });
}

// Manejo del estado del carrito
function agregarAlCarrito(producto) {
  const itemExistente = carrito.find(item => item.id === producto.id);
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: parseFloat(producto.precio),
      cantidad: 1
    });
  }
  actualizarUI();
  abrirCarrito();
}

// Exponer la función al objeto global window para que el onclick del HTML la reconozca
window.cambiarCantidad = function(id, delta) {
  // Convertimos a string o comparamos de forma flexible (==) por si el ID en Supabase es un número
  const item = carrito.find(p => String(p.id) === String(id));
  if (!item) return;

  item.cantidad += delta;

  // Si la cantidad llega a 0 o menos, eliminamos el ramo del carrito
  if (item.cantidad <= 0) {
    carrito = carrito.filter(p => String(p.id) !== String(id));
  }

  // Refrescamos la vista del carrito con los nuevos totales
  actualizarUI();
};
// Calcular extras seleccionados
function obtenerExtrasSeleccionados() {
  const extras = [];
  document.querySelectorAll('.extra-checkbox:checked').forEach(cb => {
    extras.push({
      nombre: cb.dataset.name,
      precio: parseFloat(cb.dataset.price)
    });
  });
  return extras;
}

// Actualizar Drawer y Totales
function actualizarUI() {
  const totalCantidad = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  if (cartBadge) cartBadge.innerText = totalCantidad;
  if (cartNavBadge) cartNavBadge.innerText = totalCantidad;

  if (carrito.length === 0) {
    cartItemsContainer.innerHTML = `<p class="empty-cart-msg">Tu carrito está vacío.</p>`;
  } else {
    cartItemsContainer.innerHTML = "";
    carrito.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <div>
          <div class="cart-item-title">${item.nombre}</div>
          <div class="cart-item-price">Bs ${(item.precio * item.cantidad).toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <button onclick="cambiarCantidad('${item.id}', -1)">-</button>
          <span>${item.cantidad}</span>
          <button onclick="cambiarCantidad('${item.id}', 1)">+</button>
        </div>
      `;
      cartItemsContainer.appendChild(itemEl);
    });
  }

  // Sumar productos + extras
  const subtotalRamos = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const subtotalExtras = obtenerExtrasSeleccionados().reduce((sum, ext) => sum + ext.precio, 0);
  const granTotal = subtotalRamos + subtotalExtras;

  if (cartTotalPrice) cartTotalPrice.innerText = `Bs ${granTotal.toFixed(2)}`;
}

// Recalcular al cambiar checkboxes de extras
document.querySelectorAll('.extra-checkbox').forEach(chk => {
  chk.addEventListener('change', actualizarUI);
});

// Enviar Pedido a WhatsApp
btnCheckout.addEventListener('click', () => {
  if (carrito.length === 0) {
    alert("Por favor agrega al menos un ramo a tu pedido.");
    return;
  }

  const tipoEntrega = document.querySelector('input[name="tipo_entrega"]:checked').value;
  const direccion = direccionInput ? direccionInput.value.trim() : "";
  const fecha = fechaInput ? fechaInput.value : "";
  const hora = horaInput ? horaInput.value : "";
  const nota = notaInput ? notaInput.value.trim() : "";

  // Validaciones obligatorias

  if (tipoEntrega === 'Delivery' && !direccion) {
    alert("Por favor ingresa la dirección de entrega.");
    direccionInput.focus();
    return;
  }

  if (!fecha) {
    alert("Por favor selecciona la fecha deseada para recibir el pedido.");
    fechaInput.focus();
    return;
  }
  if (!fecha || !hora) {
    alert("Por favor selecciona la fecha y la hora deseada para recibir el pedido.");
    return;
  }

  // Generar mensaje
  let mensaje = `*¡HOLA! QUIERO REALIZAR UN PEDIDO EN BLOOMS*\n\n`;
  mensaje += `💐 *RAMOS SELECCIONADOS:*\n`;
  carrito.forEach(item => {
    mensaje += `• ${item.cantidad}x ${item.nombre} — Bs ${(item.precio * item.cantidad).toFixed(2)}\n`;
  });

  const extras = obtenerExtrasSeleccionados();
  if (extras.length > 0) {
    mensaje += `\n✨ *DETALLES EXTRAS:*\n`;
    extras.forEach(ext => {
      mensaje += `• ${ext.nombre} (+Bs ${ext.precio.toFixed(2)})\n`;
    });
  }

  const subtotalRamos = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const subtotalExtras = extras.reduce((sum, ext) => sum + ext.precio, 0);
  const total = (subtotalRamos + subtotalExtras).toFixed(2);

  mensaje += `\n💰 *TOTAL ESTIMADO:* Bs ${total}\n`;
  mensaje += `--------------------------\n`;
  mensaje += `📋 *DATOS DE ENTREGA:*\n`;
  mensaje += `• *Tipo:* ${tipoEntrega}\n`;
  if (tipoEntrega === 'Delivery') {
    mensaje += `• *Dirección:* ${direccion}\n`;
  }
  mensaje += `• *Fecha requerida:* ${fecha}\n`;
  mensaje += `• *Hora aproximada:* ${hora}\n`;
  if (nota) {
    mensaje += `• *Nota/Mensaje:* ${nota}\n`;
  }
  mensaje += `\nQuedo a la espera de sus datos para coordinar el pago.`;

  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
});

// Inicialización de Menú Móvil y Scroll
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const closeMobile = document.getElementById('close-mobile');
const backTop = document.getElementById('back-top');

if (menuToggle && mobileMenu && closeMobile) {
  menuToggle.addEventListener('click', () => mobileMenu.classList.add('open'));
  closeMobile.addEventListener('click', () => mobileMenu.classList.remove('open'));
}

if (backTop) {
  window.addEventListener('scroll', () => backTop.classList.toggle('show', window.scrollY > 500));
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

document.addEventListener('DOMContentLoaded', fetchProductos);
// ---- Lógica para Filtrar por Categorías ----
document.addEventListener('DOMContentLoaded', () => {
  const botonesCategoria = document.querySelectorAll('.filter-cat');

  botonesCategoria.forEach(boton => {
    boton.addEventListener('click', (e) => {
      const categoriaSeleccionada = boton.getAttribute('data-cat');
      
      // Si elige "Todas", mostramos la lista completa original
      if (categoriaSeleccionada === 'Todas') {
        renderProductos(productosData);
        return;
      }

      // Filtramos la lista buscando la palabra en la categoría, tag o nombre del producto
      const productosFiltrados = productosData.filter(prod => {
        const coincidenciaNombre = prod.nombre && prod.nombre.toLowerCase().includes(categoriaSeleccionada.toLowerCase());
        const coincidenciaCategoria = prod.categoria && prod.categoria.toLowerCase().includes(categoriaSeleccionada.toLowerCase());
        const coincidenciaTag = prod.tag && prod.tag.toLowerCase().includes(categoriaSeleccionada.toLowerCase());
        
        return coincidenciaNombre || coincidenciaCategoria || coincidenciaTag;
      });

      // Renderizamos solo los que coinciden
      renderProductos(productosFiltrados);
    });
  });
});
// ---- Botón para ver todos los productos ----
document.addEventListener('DOMContentLoaded', () => {
  const btnVerTodos = document.getElementById('btn-ver-todos');
  
  if (btnVerTodos) {
    btnVerTodos.addEventListener('click', (e) => {
      // Si quieres evitar que el navegador dé un salto brusco al hacer clic, descomenta la siguiente línea:
      // e.preventDefault(); 
      
      // Vuelve a cargar el array original con todos los productos
      renderProductos(productosData);
    });
  }
});
// ==================== CARRUSEL HERO ====================
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.hero-slide');
  const dotsWrap = document.getElementById('hero-dots');
  let current = 0;

  if (slides.length > 0 && dotsWrap) {
    // Crear los puntos (dots) dinámicamente según la cantidad de imágenes
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsWrap.appendChild(dot);
    });
    
    const dots = dotsWrap.querySelectorAll('button');

    function goToSlide(index){
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = index;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    // Cambiar de imagen automáticamente cada 5 segundos (5000 milisegundos)
    setInterval(() => {
      goToSlide((current + 1) % slides.length);
    }, 5000);
  }
});
// ==================== LÓGICA DEL BUSCADOR DE RAMOS (PÍLDORA) ====================
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('filter-date');
    const occasionInput = document.getElementById('filter-occasion');
    const priceInput = document.getElementById('filter-price');
    
    const displayDate = document.getElementById('display-date');
    const displayOccasion = document.getElementById('display-occasion');
    const displayPrice = document.getElementById('display-price');
    const btnSearch = document.getElementById('btn-search');

    // 1. Actualizar textos al seleccionar
   // 1. Actualizar textos al seleccionar
    if (dateInput) {
        // Forzar la apertura nativa del calendario al hacer clic
        dateInput.addEventListener('click', function() {
            try {
                this.showPicker();
            } catch (e) {
                // Si el navegador es antiguo, ignora el error y usa el comportamiento normal
            }
        });

        // Actualizar el texto cuando se selecciona una fecha
        dateInput.addEventListener('change', (e) => {
            if (e.target.value) {
                // Formatear la fecha para que se vea bonita (ej. "15 oct")
                const dateObj = new Date(e.target.value + 'T00:00:00'); 
                const options = { day: 'numeric', month: 'short' };
                displayDate.innerText = dateObj.toLocaleDateString('es-ES', options);
            } else {
                displayDate.innerText = "seleccione una fecha";
            }
        });
    }

    if (occasionInput) {
        occasionInput.addEventListener('change', (e) => {
            displayOccasion.innerText = e.target.options[e.target.selectedIndex].text;
        });
    }

    if (priceInput) {
        priceInput.addEventListener('change', (e) => {
            displayPrice.innerText = e.target.options[e.target.selectedIndex].text;
        });
    }

    // 2. Ejecutar Filtro
    if (btnSearch) {
        btnSearch.addEventListener('click', () => {
            const maxPrice = parseFloat(priceInput.value);
            const occasion = occasionInput.value.toLowerCase();
            const selectedDate = dateInput.value;

            const productosFiltrados = productosData.filter(prod => {
                // Filtro Precio
                const p = parseFloat(prod.precio);
                if (p > maxPrice) return false;

                // Filtro Ocasión
                if (occasion !== 'todos') {
                    const matchOccasion = 
                        (prod.categoria && prod.categoria.toLowerCase().includes(occasion)) ||
                        (prod.tag && prod.tag.toLowerCase().includes(occasion)) ||
                        (prod.nombre && prod.nombre.toLowerCase().includes(occasion));
                    if (!matchOccasion) return false;
                }

                return true;
            });

            renderProductos(productosFiltrados);
            document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// ==================== FAQ ACORDEÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Cierra todos los demás primero
            faqItems.forEach(other => other.classList.remove('open'));

            // Si estaba cerrado, lo abre; si ya estaba abierto, queda cerrado
            if (!isOpen) item.classList.add('open');
        });
    });
});