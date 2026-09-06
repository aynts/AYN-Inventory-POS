// AYN Inventory & POS - Main JavaScript

let inventory = [];
let cart = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-date").textContent = new Date().toLocaleDateString('en-GB');
  loadInventory();
});

// Toast Notification
function showToast(message, type = 'success') {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast-notice ${type} active`;
  setTimeout(() => {
    toast.classList.remove("active");
  }, 3000);
}

// Tab Switching
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  if (tab === 'pos') {
    document.getElementById('pos-view').classList.add('active');
    document.getElementById('tab-pos').classList.add('active');
    document.getElementById('mode-selector').value = "POS";
    updatePosItemSelect();
  } else {
    document.getElementById('inventory-view').classList.add('active');
    document.getElementById('tab-inventory').classList.add('active');
    document.getElementById('mode-selector').value = "INV";
    renderInventoryTable();
  }
}

document.getElementById('mode-selector').addEventListener('change', (e) => {
  if(e.target.value === 'POS') switchTab('pos');
  else switchTab('inventory');
});

// ==========================================
// INVENTORY MANAGEMENT
// ==========================================

function loadInventory() {
  const data = localStorage.getItem("ayn_inventory");
  if (data) {
    inventory = JSON.parse(data);
    renderInventoryTable();
    updatePosItemSelect();
  } else {
    // Seed data from products.json if empty
    fetch('products.json')
      .then(response => response.json())
      .then(products => {
        inventory = products.map(p => ({
          id: p.id.toString(),
          name: p.name,
          desc: p.category || "",
          price: p.price,
          stock: 100 // Default stock if none provided
        }));
        saveInventoryToStorage();
        renderInventoryTable();
        updatePosItemSelect();
      })
      .catch(err => {
        console.error("Failed to load products.json", err);
        inventory = [];
        renderInventoryTable();
        updatePosItemSelect();
      });
  }
}

function saveInventoryToStorage() {
  localStorage.setItem("ayn_inventory", JSON.stringify(inventory));
}

function saveInventoryItem() {
  const idInput = document.getElementById("inv-id").value;
  const name = document.getElementById("inv-name").value.trim();
  const desc = document.getElementById("inv-desc").value.trim();
  const price = parseFloat(document.getElementById("inv-price").value);
  const stock = parseInt(document.getElementById("inv-stock").value);

  if (!name) {
    showToast("Item name is required!", "error");
    return;
  }
  
  if (isNaN(price) || price <= 0) {
    showToast("A valid Price greater than 0 is required!", "error");
    return;
  }
  
  if (isNaN(stock) || stock < 0) {
    showToast("A valid Stock quantity is required!", "error");
    return;
  }

  if (idInput) {
    // Update
    const idx = inventory.findIndex(item => item.id === idInput);
    if (idx > -1) {
      inventory[idx] = { id: idInput, name, desc, price, stock };
      showToast("Item updated successfully.");
    }
  } else {
    // Add
    const newItem = {
      id: Date.now().toString(),
      name, desc, price, stock
    };
    inventory.push(newItem);
    showToast("Item added successfully.");
  }

  saveInventoryToStorage();
  renderInventoryTable();
  clearInventoryForm();
}

function editInventoryItem(id) {
  const item = inventory.find(i => i.id === id);
  if (item) {
    document.getElementById("inv-id").value = item.id;
    document.getElementById("inv-name").value = item.name;
    document.getElementById("inv-desc").value = item.desc;
    document.getElementById("inv-price").value = item.price;
    document.getElementById("inv-stock").value = item.stock;
    window.scrollTo(0, 0);
  }
}

function deleteInventoryItem(id) {
  if (confirm("Are you sure you want to delete this item?")) {
    inventory = inventory.filter(i => i.id !== id);
    saveInventoryToStorage();
    renderInventoryTable();
    showToast("Item deleted.");
  }
}

function clearInventoryForm() {
  document.getElementById("inv-id").value = "";
  document.getElementById("inv-name").value = "";
  document.getElementById("inv-desc").value = "";
  document.getElementById("inv-price").value = "";
  document.getElementById("inv-stock").value = "";
}

function renderInventoryTable() {
  const tbody = document.getElementById("inventory-tbody");
  tbody.innerHTML = "";
  
  if (inventory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No inventory items found. Add some above.</td></tr>`;
    return;
  }

  inventory.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-size: 11px; color:#64748b;">...${item.id.slice(-4)}</td>
      <td style="font-weight: 600;">${item.name}</td>
      <td>${item.desc}</td>
      <td class="text-right">${item.price.toLocaleString()}</td>
      <td class="text-center" style="font-weight: 700; color: ${item.stock > 5 ? '#047857' : '#b91c1c'}">${item.stock}</td>
      <td class="text-center">
        <button class="btn btn-save" style="padding: 4px 8px; font-size:12px; margin-right:4px;" onclick="editInventoryItem('${item.id}')">Edit</button>
        <button class="btn btn-del" onclick="deleteInventoryItem('${item.id}')">Del</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// POS SYSTEM
// ==========================================

function updatePosItemSelect() {
  const select = document.getElementById("pos-item-select");
  select.innerHTML = `<option value="">-- Select an Item --</option>`;
  inventory.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} - MMK ${item.price.toLocaleString()} (Stock: ${item.stock})`;
    select.appendChild(option);
  });
}

function addToCart() {
  const itemId = document.getElementById("pos-item-select").value;
  const qty = parseInt(document.getElementById("pos-item-qty").value) || 1;

  if (!itemId) {
    showToast("Please select an item first.", "error");
    return;
  }

  const inventoryItem = inventory.find(i => i.id === itemId);
  if (!inventoryItem) return;

  if (qty <= 0) {
    showToast("Quantity must be at least 1.", "error");
    return;
  }

  // Check stock
  const existingCartItem = cart.find(c => c.id === itemId);
  const currentCartQty = existingCartItem ? existingCartItem.qty : 0;
  
  if (currentCartQty + qty > inventoryItem.stock) {
    showToast(`Cannot add. Only ${inventoryItem.stock} in stock!`, "error");
    return;
  }

  if (existingCartItem) {
    existingCartItem.qty += qty;
  } else {
    cart.push({
      id: inventoryItem.id,
      name: inventoryItem.name,
      price: inventoryItem.price,
      qty: qty
    });
  }

  document.getElementById("pos-item-qty").value = 1;
  document.getElementById("pos-item-select").value = "";
  
  renderCartTable();
  showToast("Added to cart.");
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  renderCartTable();
}

function updateCartQty(id, newQty) {
  newQty = parseInt(newQty);
  const cartItem = cart.find(c => c.id === id);
  const invItem = inventory.find(i => i.id === id);
  
  if (newQty <= 0) {
    removeFromCart(id);
    return;
  }
  
  if (invItem && newQty > invItem.stock) {
    showToast(`Maximum stock available is ${invItem.stock}`, "error");
    renderCartTable(); // re-render to reset input
    return;
  }

  if (cartItem) {
    cartItem.qty = newQty;
    renderCartTable();
  }
}

function renderCartTable() {
  const tbody = document.getElementById("cart-tbody");
  tbody.innerHTML = "";
  
  let subtotal = 0;

  if (cart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Cart is empty.</td></tr>`;
  } else {
    cart.forEach((item, index) => {
      const lineTotal = item.price * item.qty;
      subtotal += lineTotal;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td style="font-weight: 600;">${item.name}</td>
        <td class="text-right">${item.price.toLocaleString()}</td>
        <td>
          <input type="number" value="${item.qty}" min="1" 
                 style="width: 100%; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" 
                 onchange="updateCartQty('${item.id}', this.value)">
        </td>
        <td class="text-right" style="font-weight: 700;">${lineTotal.toLocaleString()}</td>
        <td class="text-center">
          <button class="btn btn-del" onclick="removeFromCart('${item.id}')">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const tax = 0; // Can be updated if needed
  const grandTotal = subtotal + tax;

  document.getElementById("pos-subtotal").textContent = subtotal.toLocaleString();
  document.getElementById("pos-tax").textContent = tax.toLocaleString();
  document.getElementById("pos-total").textContent = grandTotal.toLocaleString();
}

function checkout() {
  const customerName = document.getElementById("pos-customer-name").value.trim();
  
  if (!customerName) {
    showToast("Customer Name is required!", "error");
    return;
  }

  if (cart.length === 0) {
    showToast("Cart is empty!", "error");
    return;
  }

  // Deduct stock from inventory
  cart.forEach(cartItem => {
    const invItem = inventory.find(i => i.id === cartItem.id);
    if (invItem) {
      invItem.stock -= cartItem.qty;
    }
  });

  saveInventoryToStorage();
  
  // Clear cart & customer
  cart = [];
  document.getElementById("pos-customer-name").value = "";
  document.getElementById("pos-customer-phone").value = "";
  
  renderCartTable();
  updatePosItemSelect();
  
  showToast("Checkout successful! Stock updated.", "success");
}
