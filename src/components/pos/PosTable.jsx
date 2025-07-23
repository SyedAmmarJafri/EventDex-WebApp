import React, { useState, useEffect, useRef } from 'react';
import { FiShoppingCart, FiUser, FiEdit, FiPlus, FiMinus, FiCamera, FiX } from 'react-icons/fi';
import { BASE_URL } from '/src/paths.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Quagga from 'quagga';

const scanBeepSound = new Audio('/music/store-scanner-beep-90395.mp3');

const SkeletonLoader = ({ type }) => {
  if (type === 'category') {
    return (
      <div className="skeleton-category">
        <div className="skeleton-line"></div>
      </div>
    );
  }

  if (type === 'product') {
    return (
      <div className="skeleton-product">
        <div className="skeleton-image"></div>
        <div className="skeleton-info">
          <div className="skeleton-line short"></div>
          <div className="skeleton-line very-short"></div>
        </div>
      </div>
    );
  }

  if (type === 'cart-item') {
    return (
      <div className="skeleton-cart-item">
        <div className="skeleton-image small"></div>
        <div className="skeleton-details">
          <div className="skeleton-line medium"></div>
          <div className="skeleton-line short"></div>
        </div>
        <div className="skeleton-controls">
          <div className="skeleton-button"></div>
          <div className="skeleton-quantity"></div>
          <div className="skeleton-button"></div>
        </div>
        <div className="skeleton-total"></div>
      </div>
    );
  }

  return (
    <div className="skeleton-default">
      <div className="skeleton-line"></div>
    </div>
  );
};

const SmartPOS = () => {
  // Get currency settings from localStorage
  const authData = JSON.parse(localStorage.getItem("authData"));
  const currencySymbol = authData?.currencySettings?.currencySymbol || '$';
  const taxRate = authData?.taxDetails?.gstRate || 0;

  const formatCurrency = (value) => {
    return `${currencySymbol}${(value || 0).toFixed(2)}`;
  };

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState({ categories: true, items: true });
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderStatus, setOrderStatus] = useState(null);
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const scannerRef = useRef(null);
  const [scannedCode, setScannedCode] = useState('');
  
  // Variant state
  const [selectedItemForVariant, setSelectedItemForVariant] = useState(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState({});

  // Toast notification helpers
  const showSuccessToast = (message) => {
    toast.success(message, {
      position: "bottom-center",
      autoClose: 500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  };

  const showErrorToast = (message) => {
    toast.error(message, {
      position: "bottom-center",
      autoClose: 500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const authData = JSON.parse(localStorage.getItem("authData"));
        if (!authData?.token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`${BASE_URL}/api/client-admin/categories`, {
          headers: {
            'Authorization': `Bearer ${authData.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        if (data.status === 200 && data.data) {
          const activeCategories = data.data.filter(category => category.active === true);
          setCategories([{ id: 'All', name: 'All' }, ...activeCategories]);
        } else {
          throw new Error(data.message || 'Failed to fetch categories');
        }
      } catch (err) {
        setError(err.message);
        showErrorToast(err.message);
      } finally {
        setLoading(prev => ({ ...prev, categories: false }));
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchItemsByCategory = async () => {
      try {
        setLoading(prev => ({ ...prev, items: true }));
        const authData = JSON.parse(localStorage.getItem("authData"));
        if (!authData?.token) {
          throw new Error("No authentication token found");
        }

        let url = `${BASE_URL}/api/client-admin/items`;
        if (activeCategory !== 'All') {
          url = `${BASE_URL}/api/client-admin/items/category/${activeCategory}`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${authData.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }

        const data = await response.json();
        if (data.status === 200 && data.data) {
          const activeItems = data.data.filter(item => item.active === true);
          setItems(activeItems);
        } else {
          throw new Error(data.message || 'Failed to fetch items');
        }
      } catch (err) {
        setError(err.message);
        showErrorToast(err.message);
      } finally {
        setLoading(prev => ({ ...prev, items: false }));
      }
    };

    fetchItemsByCategory();
  }, [activeCategory]);

  // Initialize the barcode scanner
  useEffect(() => {
    let initialized = false;

    const initializeScanner = async () => {
      try {
        if (!showScanner || scannerInitialized) return;

        await Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: 480,
              height: 320,
              facingMode: "environment"
            },
          },
          decoder: {
            readers: [
              "ean_reader", "ean_8_reader",
              "code_128_reader", "code_39_reader",
              "codabar_reader", "upc_reader", "upc_e_reader"
            ],
            multiple: false
          },
          locate: true,
          frequency: 10
        }, function (err) {
          if (err) {
            console.error("Scanner initialization failed", err);
            showErrorToast("Failed to initialize scanner. Please check camera permissions.");
            return;
          }
          initialized = true;
          setScannerInitialized(true);
          Quagga.start();
        });

        Quagga.onDetected((result) => {
          if (result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            setScannedCode(code);
            handleBarcodeScan(code);
          }
        });

        Quagga.onProcessed((result) => {
          if (!result) return;

          // Draw detection boxes on the video feed
          const drawingCtx = Quagga.canvas.ctx.overlay;
          const drawingCanvas = Quagga.canvas.dom.overlay;

          drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

          if (result.boxes) {
            result.boxes.filter(box => box !== result.box).forEach(box => {
              Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
            });
          }

          if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "blue", lineWidth: 2 });
          }
        });

      } catch (err) {
        console.error("Scanner error:", err);
        showErrorToast("Scanner error: " + err.message);
      }
    };

    initializeScanner();

    return () => {
      if (initialized) {
        Quagga.offDetected();
        Quagga.offProcessed();
        Quagga.stop();
      }
    };
  }, [showScanner]);

  const openScanner = () => {
    setShowScanner(true);
    setScannedCode('');
    setScannerInitialized(false);
  };

  const closeScanner = () => {
    if (scannerInitialized) {
      Quagga.offDetected();
      Quagga.offProcessed();
      Quagga.stop();
      setScannerInitialized(false);
    }
    setShowScanner(false);
  };

  const handleBarcodeScan = (barcode) => {
    const normalizedBarcode = barcode.replace(/\D/g, '');
    const scannedItem = items.find(item => {
      if (!item.barcode) return false;
      return item.barcode.replace(/\D/g, '') === normalizedBarcode;
    });

    if (scannedItem) {
      if (scannedItem.variants && scannedItem.variants.length > 0) {
        setSelectedItemForVariant(scannedItem);
      } else {
        addToCart(scannedItem);
        scanBeepSound.play();
      }
    } else {
      showErrorToast(`Product not found (Scanned: ${barcode})`);
    }
  };

  const addToCart = (item, selectedOptions = {}) => {
    // Calculate final price with variant modifiers
    let finalPrice = item.price;
    let variantDescription = '';
    
    if (item.variants && item.variants.length > 0) {
      Object.values(selectedOptions).forEach(option => {
        if (option) {
          finalPrice += option.priceModifier || 0;
          variantDescription += `${option.name}, `;
        }
      });
      variantDescription = variantDescription.replace(/,\s*$/, '');
    }

    const cartItem = {
      ...item,
      quantity: 1,
      finalPrice,
      variantDescription,
      variantOptions: selectedOptions
    };

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => 
        cartItem.id === item.id && 
        JSON.stringify(cartItem.variantOptions) === JSON.stringify(selectedOptions)
      );

      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += 1;
        return updatedCart;
      } else {
        return [...prevCart, cartItem];
      }
    });

    showSuccessToast(`${item.name} added to cart`);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => {
      const itemToRemove = prevCart.find(item => item.id === id);
      if (itemToRemove) {
        showSuccessToast(`${itemToRemove.name} removed from cart`);
      }
      return prevCart.filter(item => item.id !== id);
    });
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setNotes('');
    setPaymentMethod('Cash');
    setOrderStatus(null);
    showSuccessToast('Cart cleared');
  };

  const handleVariantSelection = (variantName, option) => {
    setSelectedVariantOptions(prev => ({
      ...prev,
      [variantName]: option
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.finalPrice || item.price) * item.quantity), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount;

  const printPDFInvoice = (base64Pdf, orderNumber) => {
    try {
      const binaryString = atob(base64Pdf);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(blob);

      const printWindow = window.open(pdfUrl);

      if (printWindow) {
        printWindow.onload = () => {
          try {
            printWindow.print();
          } catch (e) {
            console.warn('Auto-print failed, user can print manually', e);
            showErrorToast('Auto-print failed. Please print manually from the opened window.');
          }
        };
      } else {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.download = `invoice_${orderNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccessToast(`Invoice for order #${orderNumber} is ready to print. Please check your downloads or the new tab.`);
      }
    } catch (error) {
      console.error('Error handling PDF invoice:', error);
      showErrorToast('Invoice generated but there was an error opening it automatically. Please contact support.');
    }
  };

  const placeOrder = async () => {
    try {
      setOrderStatus('processing');
      const authData = JSON.parse(localStorage.getItem("authData"));
      if (!authData?.token) {
        throw new Error('No authentication token found');
      }

      const orderItems = cart.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
        price: item.finalPrice || item.price,
        name: item.name,
        variantOptions: item.variantOptions
      }));

      const order = {
        items: orderItems,
        paymentMethod: paymentMethod.toUpperCase(),
        discountAmount: discount,
        customerName: customerName || 'Walk-in Customer',
        notes: notes || ''
      };

      const response = await fetch(`${BASE_URL}/api/client-admin/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify(order)
      });

      const responseData = await response.json();

      if (!response.ok || responseData.status !== 201) {
        throw new Error(responseData.message || 'Failed to place order');
      }

      setOrderStatus('success');
      showSuccessToast('Order placed successfully!');

      if (responseData.data.pdfInvoice) {
        printPDFInvoice(responseData.data.pdfInvoice, responseData.data.orderNumber);
      }
    } catch (err) {
      setOrderStatus('error');
      showErrorToast(`Error placing order: ${err.message}`);
    }
  };

  if (loading.categories || loading.items) {
    return (
      <div className="skeleton-container">
        <div className="skeleton-header">
          <div className="skeleton-logo"></div>
          <div className="skeleton-customer-input"></div>
          <div className="skeleton-payment-method"></div>
          <div className="skeleton-cart-summary"></div>
        </div>

        <div className="skeleton-main">
          <div className="products-section">
            <div className="skeleton-categories">
              {[...Array(6)].map((_, i) => (
                <SkeletonLoader key={`category-${i}`} type="category" />
              ))}
            </div>

            <div className="skeleton-products">
              {[...Array(12)].map((_, i) => (
                <SkeletonLoader key={`product-${i}`} type="product" />
              ))}
            </div>
          </div>

          <div className="skeleton-order-section">
            <div className="skeleton-order-header">
              <div className="skeleton-title"></div>
              <div className="skeleton-clear-btn"></div>
            </div>

            <div className="skeleton-cart-items">
              {[...Array(3)].map((_, i) => (
                <SkeletonLoader key={`cart-item-${i}`} type="cart-item" />
              ))}
            </div>

            <div className="skeleton-summary">
              <div className="skeleton-summary-row"></div>
              <div className="skeleton-summary-row"></div>
              <div className="skeleton-summary-row"></div>
              <div className="skeleton-summary-row total"></div>
            </div>

            <div className="skeleton-actions">
              <div className="skeleton-action-btn"></div>
              <div className="skeleton-action-btn primary"></div>
            </div>
          </div>
        </div>

        <style>{`
          .skeleton-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            border-radius: 10px;
            background-color: white;
          }
          
          .skeleton-header {
            display: flex;
            flex-direction: column;
            padding: 1rem;
            background-color: white;
            border-bottom: 1px solid #e9ecef;
            gap: 1rem;
          }
          
          .skeleton-logo {
            width: 120px;
            height: 30px;
            background-color: #e9ecef;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-customer-input {
            height: 40px;
            background-color: #e9ecef;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-payment-method {
            height: 40px;
            background-color: #e9ecef;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-cart-summary {
            height: 40px;
            background-color: #e9ecef;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-main {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          
          .products-section {
            flex: 1;
            overflow-y: auto;
          }
          
          .skeleton-categories {
            display: flex;
            gap: 0.5rem;
            padding: 1rem;
            overflow-x: auto;
            margin-bottom: 1rem;
          }
          
          .skeleton-category {
            min-width: 80px;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            background-color: #e9ecef;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-products {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1rem;
            padding: 1rem;
          }
          
          .skeleton-product {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            height: 180px;
            display: flex;
            flex-direction: column;
            border: 1px solid #e9ecef;
          }
          
          .skeleton-image {
            height: 120px;
            background-color: #e9ecef;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-info {
            padding: 0.5rem;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .skeleton-line {
            height: 12px;
            background-color: #e9ecef;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
            margin-bottom: 4px;
          }
          
          .skeleton-line.short {
            width: 70%;
          }
          
          .skeleton-line.very-short {
            width: 40%;
            height: 10px;
          }
          
          .skeleton-order-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            border-top: 1px solid #e9ecef;
            background-color: white;
          }
          
          .skeleton-order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #e9ecef;
          }
          
          .skeleton-title {
            width: 100px;
            height: 24px;
            background-color: #e9ecef;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-clear-btn {
            width: 70px;
            height: 24px;
            background-color: #e9ecef;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-cart-items {
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .skeleton-cart-item {
            display: flex;
            padding: 1rem 0;
            border-bottom: 1px solid #e9ecef;
            gap: 1rem;
            align-items: center;
          }
          
          .skeleton-image.small {
            width: 50px;
            height: 50px;
            border-radius: 8px;
          }
          
          .skeleton-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .skeleton-line.medium {
            width: 80%;
          }
          
          .skeleton-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .skeleton-button {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: #e9ecef;
            animation: pulse 1.5s infinite ease-in-out;
            border: 1px solid #e9ecef;
          }
          
          .skeleton-quantity {
            width: 20px;
            height: 20px;
            background-color: #e9ecef;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-total {
            width: 60px;
            height: 20px;
            background-color: #e9ecef;
            animation: pulse 1.5s infinite ease-in-out;
            border-radius: 4px;
          }
          
          .skeleton-summary {
            padding: 1rem;
            border-top: 1px solid #e9ecef;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .skeleton-summary-row {
            height: 16px;
            background-color: #e9ecef;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-summary-row.total {
            height: 20px;
            margin-top: 1rem;
          }
          
          .skeleton-actions {
            display: flex;
            padding: 1rem;
            gap: 0.5rem;
          }
          
          .skeleton-action-btn {
            flex: 1;
            height: 40px;
            background-color: #e9ecef;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-action-btn.primary {
            background-color: #cfe2ff;
          }
          
          @keyframes pulse {
            0% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.6;
            }
          }
          
          @media (min-width: 640px) {
            .skeleton-header {
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }
            
            .skeleton-customer-input {
              width: 200px;
            }
            
            .skeleton-payment-method {
              width: 120px;
            }
            
            .skeleton-cart-summary {
              width: 180px;
            }
          }
          
          @media (min-width: 768px) {
            .skeleton-main {
              flex-direction: row;
            }
            
            .skeleton-order-section {
              border-left: 1px solid #e9ecef;
              border-top: none;
              max-width: 350px;
            }
          }
          
          @media (min-width: 1024px) {
            .skeleton-order-section {
              max-width: 400px;
            }
            
            .skeleton-products {
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <>
      <ToastContainer
        position="bottom-center"
        autoClose={100}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* Scanner Modal */}
      {showScanner && (
        <div className="scanner-modal">
          <div className="scanner-modal-content">
            <div className="scanner-header">
              <h5 style={{ color: 'white' }}>Barcode Scanner</h5>
              <button onClick={closeScanner} className="close-scanner">
                &times;
              </button>
            </div>
            <div className="scanner-container" ref={scannerRef}>
              {!scannerInitialized ? (
                <div className="scanner-loading">
                  <div className="spinner"></div>
                  <p>Initializing scanner...</p>
                </div>
              ) : (
                <div className="scanner-overlay">
                  <div className="scanning-frame">
                    <div className="corner top-left"></div>
                    <div className="corner top-right"></div>
                    <div className="corner bottom-left"></div>
                    <div className="corner bottom-right"></div>
                  </div>
                  <div className="scanning-line"></div>
                </div>
              )}
            </div>
            <div className="manual-entry">
              <input
                type="text"
                placeholder="Enter barcode manually"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && scannedCode) {
                    handleBarcodeScan(scannedCode);
                  }
                }}
                className="manual-input"
              />
              <button
                onClick={() => {
                  if (scannedCode) {
                    handleBarcodeScan(scannedCode);
                  }
                }}
                className="manual-submit-btn"
                disabled={!scannedCode}
              >
                Add Item
              </button>
            </div>
            <div className="scanner-footer">
              {scannedCode && (
                <div className="scanned-result">
                  <span>Current Code:</span>
                  <strong>{scannedCode}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {selectedItemForVariant && (
        <div className="variant-modal">
          <div className="variant-modal-content">
            <div className="variant-modal-header">
              <h3>{selectedItemForVariant.name}</h3>
              <button 
                onClick={() => {
                  setSelectedItemForVariant(null);
                  setSelectedVariantOptions({});
                }}
                className="close-variant-modal"
              >
                <FiX />
              </button>
            </div>
            <p className="base-price">Base Price: {formatCurrency(selectedItemForVariant.price)}</p>
            
            {selectedItemForVariant.variants.map(variant => (
              <div key={variant.name} className="variant-section">
                <h4>{variant.name} {variant.required && <span className="required-asterisk">*</span>}</h4>
                {variant.description && <p className="variant-description">{variant.description}</p>}
                
                <div className="variant-options">
                  {variant.options.map(option => (
                    <button
                      key={option.name}
                      className={`variant-option ${
                        selectedVariantOptions[variant.name]?.name === option.name ? 'selected' : ''
                      }`}
                      onClick={() => handleVariantSelection(variant.name, option)}
                    >
                      {option.name} (+{formatCurrency(option.priceModifier)})
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="variant-modal-actions">
              <button 
                className="action-btn place-order-btn"
                onClick={() => {
                  addToCart(selectedItemForVariant, selectedVariantOptions);
                  setSelectedItemForVariant(null);
                  setSelectedVariantOptions({});
                }}
                disabled={selectedItemForVariant.variants.some(v => v.required && !selectedVariantOptions[v.name])}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pos-container">
        <div className="pos-header">
          <div className="header-left">
          </div>
          <div className="header-right">
            <div className="customer-input">
              <FiUser className="customer-icon" />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="customer-input-field"
              />
            </div>
            <div className="customer-input">
              <FiEdit className="customer-icon" />
              <input
                type="text"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="customer-input-field"
              />
            </div>
            <div className="payment-method">
              <select
                className="payment-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <button
              className="scanner-btn"
              onClick={openScanner}
              title="Scan barcode"
            >
              <FiCamera className="scanner-icon" />
              <span>Scanner</span>
            </button>
            <div className="cart-summary">
              <FiShoppingCart className="cart-icon" />
              <span>{cart.length} items</span>
              <span className="total-preview">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="pos-main">
          <div className="products-section">
            <div className="category-filter-container">
              <div className="category-filter">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {loading.items ? (
              <div className="loading-items">Loading products...</div>
            ) : (
              <div className="product-grid-container">
                <div className="product-grid">
                  {items.map(item => (
                    <div key={item.id} className="product-card">
                      <div className="product-image">
                        <img
                          src={item.primaryImageUrl || '/images/avatar/1.png'}
                          alt={item.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/avatar/1.png';
                          }}
                        />
                        <button
                          className="add-to-cart-btn"
                          onClick={() => {
                            if (item.variants && item.variants.length > 0) {
                              setSelectedItemForVariant(item);
                            } else {
                              addToCart(item);
                            }
                          }}
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <div className="product-info">
                        <h3>{item.name}</h3>
                        <p className="price">{formatCurrency(item.price)}</p>
                        {item.variants && item.variants.length > 0 && (
                          <p className="has-variants">Has options</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="order-section">
            <div className="order-header">
              <h3>Current Order</h3>
              <button className="clear-cart-btn" onClick={clearCart}>
                Clear All
              </button>
            </div>

            <div className="order-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <FiShoppingCart size={48} />
                  <p>Your cart is empty</p>
                  <small>Add items to get started</small>
                </div>
              ) : (
                <ul>
                  {cart.map(item => (
                    <li key={`${item.id}-${JSON.stringify(item.variantOptions)}`} className="order-item">
                      <div className="item-info">
                        <img
                          src={item.primaryImageUrl || '/images/avatar/1.png'}
                          alt={item.name}
                          className="item-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/avatar/1.png';
                          }}
                        />
                        <div>
                          <p className="item-name">{item.name}</p>
                          {item.variantDescription && (
                            <p className="item-variants">{item.variantDescription}</p>
                          )}
                          <p className="item-price">{formatCurrency(item.finalPrice || item.price)}</p>
                        </div>
                      </div>
                      <div className="item-controls">
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <FiMinus />
                        </button>
                        <span className="item-quantity">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <div className="item-total">
                        {formatCurrency((item.finalPrice || item.price) * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="summary-row">
                <div className="tax-control">
                  <span>Tax: {taxRate}%</span>
                </div>
                <span>{formatCurrency(tax)}</span>
              </div>

              <div className="summary-row discount-row">
                <div>
                  <span>Discount:</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="discount-input"
                  />
                </div>
                <span>-{formatCurrency(discount)}</span>
              </div>

              <div className="summary-row total-row">
                <span>Total:</span>
                <span className="total-amount">{formatCurrency(total)}</span>
              </div>
            </div>

            {orderStatus === 'success' ? (
              <div className="order-success-message">
                <p>Order placed successfully!</p>
                <button
                  onClick={clearCart}
                  className="action-btn new-order-btn"
                >
                  Start New Order
                </button>
              </div>
            ) : (
              <div className="order-actions">
                <button
                  className="action-btn cancel-btn"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Cancel
                </button>
                <button
                  className="action-btn place-order-btn"
                  onClick={placeOrder}
                  disabled={cart.length === 0 || orderStatus === 'processing'}
                >
                  {orderStatus === 'processing' ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
          :root {
            --primary: #0092ff;
            --primary-light: #4895ef;
            --secondary: #3f37c9;
            --success: #0092ff;
            --danger: #f72585;
            --warning: #f8961e;
            --light: #f8f9fa;
            --dark: #212529;
            --gray: #6c757d;
            --light-gray: #e9ecef;
            --border-radius: 8px;
            --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            overflow-x: hidden;
          }

          .pos-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: white;
            border-radius: 10px;
            box-shadow: var(--box-shadow);
          }
          
          .pos-header {
            display: flex;
            flex-direction: column;
            padding: 1rem;
            background-color: white;
            border-bottom: 1px solid #e9ecef;
            z-index: 10;
          }

          .header-left {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
          }

          .header-right {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            width: 100%;
          }
          
          .customer-input {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
          }

          .customer-icon {
            position: absolute;
            left: 0.75rem;
            color: var(--gray);
          }

          .customer-input-field {
            padding: 0.5rem 1rem 0.5rem 2rem;
            border-radius: var(--border-radius);
            border: 1px solid var(--light-gray);
            font-size: 0.9rem;
            transition: var(--transition);
            width: 100%;
          }

          .customer-input-field:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
          }

          .payment-method {
            position: relative;
            width: 100%;
          }
          
          .payment-select {
            width: 100%;
            padding: 0.5rem 1rem 0.5rem 0.75rem;
            border-radius: var(--border-radius);
            border: 1px solid var(--light-gray);
            font-size: 0.9rem;
            appearance: none;
            background-color: white;
            transition: var(--transition);
          }
          
          .payment-select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
          }

          .cart-summary {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem 1rem;
            background-color: var(--light);
            border-radius: var(--border-radius);
            cursor: pointer;
            transition: var(--transition);
            width: 100%;
          }

          .cart-icon {
            color: var(--primary);
          }

          .total-preview {
            font-weight: 600;
            color: var(--primary);
          }
          
          .pos-main {
            display: flex;
            flex-direction: column;
            flex: 1;
          }

          .products-section {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            background-color: white;
          }

          .product-grid-container {
            height: calc(100vh - 200px);
            overflow-y: auto;
            padding-right: 0.5rem;
          }

          .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1rem;
          }

          .order-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            border-top: 1px solid var(--light-gray);
            background-color: white;
          }

          .category-filter-container {
            width: 100%;
            overflow-x: auto;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
          }
          
          .category-filter {
            display: flex;
            gap: 0.5rem;
            width: max-content;
            padding-bottom: 0.5rem;
          }
          
          .category-btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: var(--border-radius);
            background-color: var(--light);
            color: var(--dark);
            cursor: pointer;
            transition: var(--transition);
            font-size: 0.85rem;
            white-space: nowrap;
          }
          
          .category-btn.active {
            background-color: var(--primary);
            color: white;
          }
          
          .product-card {
            background: white;
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: var(--box-shadow);
            transition: var(--transition);
            border: 1px solid var(--light-gray);
            height: 180px;
            display: flex;
            flex-direction: column;
          }
          
          .product-image {
            height: 120px;
            overflow: hidden;
            position: relative;
            flex-shrink: 0;
          }
          
          .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: var(--transition);
          }

          .add-to-cart-btn {
            position: absolute;
            bottom: 0.5rem;
            right: 0.5rem;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: var(--primary);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--box-shadow);
            transition: var(--transition);
            opacity: 0;
          }

          .product-card:hover .add-to-cart-btn {
            opacity: 1;
          }

          .product-info {
            padding: 0.5rem;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .product-info h3 {
            margin: 0;
            font-size: 0.9rem;
            color: var(--dark);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .product-info .price {
            margin: 0.25rem 0 0;
            font-weight: 600;
            color: var(--primary);
            font-size: 0.85rem;
          }

          .has-variants {
            margin: 0.1rem 0 0;
            font-size: 0.7rem;
            color: var(--gray);
            font-style: italic;
          }
          
          .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid var(--light-gray);
          }

          .order-header h3 {
            font-size: 1.25rem;
            color: var(--dark);
          }
          
          .clear-cart-btn {
            background: none;
            border: none;
            color: var(--danger);
            cursor: pointer;
            font-weight: 500;
            font-size: 0.9rem;
            transition: var(--transition);
          }

          .order-items {
            flex: 1;
            overflow-y: auto;
            padding: 0 0rem;
            max-height: 300px;
          }
          
          .empty-cart {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--gray);
            text-align: center;
            padding: 2rem;
          }

          .order-item {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid var(--light-gray);
          }
          
          .item-info {
            display: flex;
            align-items: center;
            flex: 1 1 100%;
            gap: 1rem;
            margin-bottom: 0.5rem;
          }
          
          .item-image {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: var(--border-radius);
          }
          
          .item-name {
            margin: 0;
            font-weight: 500;
            font-size: 0.95rem;
            color: var(--dark);
          }

          .item-variants {
            margin: 0.1rem 0 0;
            color: #666;
            font-size: 0.8rem;
            font-style: italic;
          }
          
          .item-price {
            margin: 0.25rem 0 0;
            color: var(--gray);
            font-size: 0.85rem;
          }
          
          .item-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
            justify-content: center;
          }
          
          .quantity-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 1px solid var(--light-gray);
            background: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--dark);
            transition: var(--transition);
          }

          .item-quantity {
            min-width: 20px;
            text-align: center;
            font-size: 0.9rem;
            font-weight: 500;
          }
          
          .item-total {
            flex: 1;
            text-align: right;
            font-weight: 600;
            font-size: 0.95rem;
          }
          
          .order-summary {
            padding: 1rem;
            border-top: 1px solid var(--light-gray);
            border-bottom: 1px solid var(--light-gray);
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
            font-size: 0.95rem;
          }

          .tax-control {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .tax-input {
            width: 50px;
            padding: 0.25rem;
            border: 1px solid var(--light-gray);
            border-radius: 4px;
            text-align: center;
          }
          
          .discount-input {
            width: 70px;
            margin-left: 0.5rem;
            padding: 0.25rem;
            border: 1px solid var(--light-gray);
            border-radius: 4px;
          }
          
          .total-row {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px dashed var(--light-gray);
            font-size: 1.1rem;
            font-weight: 600;
          }
          
          .total-amount {
            color: var(--primary);
            font-size: 1.2rem;
          }

          .order-success-message {
            padding: 1rem;
            text-align: center;
            background-color: rgba(76, 201, 240, 0.1);
            border-radius: var(--border-radius);
            margin: 1rem;
          }

          .order-success-message p {
            color: var(--success);
            font-weight: 500;
            margin-bottom: 1rem;
          }

          .new-order-btn {
            background-color: var(--primary);
            color: white;
            width: 100%;
            margin: 0 auto;
            max-width: 200px;
            padding: 0.75rem;
            border: none;
            border-radius: var(--border-radius);
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
          }

          .new-order-btn:hover {
            background-color: var(--primary-light);
          }
          
          .order-actions {
            display: flex;
            padding: 1rem;
            gap: 0.5rem;
          }
          
          .action-btn {
            flex: 1;
            padding: 0.5rem;
            border: none;
            border-radius: var(--border-radius);
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            height: 40px;
            transition: var(--transition);
            font-size: 0.85rem;
          }
          
          .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .cancel-btn {
            background-color: var(--light);
            color: var(--danger);
          }
          
          .place-order-btn {
            background-color: var(--success);
            color: white;
          }

          .loading, .error {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-size: 1.2rem;
          }

          .error {
            color: var(--danger);
          }

          .loading-items {
            display: flex;
            justify-content: center;
            padding: 2rem;
            color: var(--gray);
          }

          /* Scanner Button Styles */
          .scanner-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-weight: 500;
            transition: var(--transition);
            white-space: nowrap;
          }

          .scanner-btn:hover {
            background-color: var(--primary-light);
          }

          .scanner-icon {
            color: white;
          }

          /* Variant Modal Styles */
          .variant-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .variant-modal-content {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
          }

          .variant-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .close-variant-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--gray);
          }

          .variant-section {
            margin-bottom: 1.5rem;
          }

          .variant-options {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }

          .variant-option {
            padding: 0.5rem 1rem;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
          }

          .variant-option.selected {
            background-color: var(--primary);
            color: white;
            border-color: var(--primary);
          }

          .variant-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1.5rem;
          }

          .base-price {
            color: var(--primary);
            font-weight: 600;
            margin-bottom: 1rem;
          }

          .variant-description {
            color: #666;
            font-size: 0.9rem;
            margin-top: 0.25rem;
          }

          .required-asterisk {
            color: var(--danger);
          }

          @media (min-width: 640px) {
            .pos-header {
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }

            .header-right {
              flex-direction: row;
              align-items: center;
              gap: 1rem;
              width: auto;
            }

            .customer-input {
              width: 200px;
            }

            .payment-method {
              width: 120px;
            }

            .cart-summary {
              width: auto;
            }

            .scanner-btn {
              padding: 0.5rem 1rem;
            }
          }

          @media (min-width: 768px) {
            .pos-main {
              flex-direction: row;
            }

            .order-section {
              border-left: 1px solid var(--light-gray);
              border-top: none;
              max-width: 350px;
            }

            .order-item {
              flex-wrap: nowrap;
            }

            .item-info {
              flex: 2;
              margin-bottom: 0;
            }

            .action-btn {
              font-size: 0.9rem;
              padding: 0.75rem;
            }

            .product-grid-container {
              height: calc(100vh - 150px);
            }
          }

          @media (min-width: 1024px) {
            .order-section {
              max-width: 400px;
            }

            .product-grid {
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            }
          }

          /* Scanner Modal Styles */
          .scanner-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.04);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .scanner-modal-content {
            background: white;
            border-radius: 12px;
            width: 95%;
            max-width: 500px;
            overflow: hidden;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
          }

          .scanner-header {
            padding: 1rem;
            background-color: var(--primary);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .scanner-header h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
          }

          .close-scanner {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0 0.5rem;
            transition: var(--transition);
          }

          .close-scanner:hover {
            opacity: 0.8;
          }

          .scanner-container {
            width: 100%;
            height: 300px;
            position: relative;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }

          .scanner-loading {
            color: white;
            text-align: center;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .scanner-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .scanning-frame {
            width: 80%;
            height: 150px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            position: relative;
          }

          .corner {
            position: absolute;
            width: 30px;
            height: 30px;
            border-color: var(--primary);
            border-width: 3px;
            border-style: solid;
          }

          .corner.top-left {
            top: -3px;
            left: -3px;
            border-right: none;
            border-bottom: none;
          }

          .corner.top-right {
            top: -3px;
            right: -3px;
            border-left: none;
            border-bottom: none;
          }

          .corner.bottom-left {
            bottom: -3px;
            left: -3px;
            border-right: none;
            border-top: none;
          }

          .corner.bottom-right {
            bottom: -3px;
            right: -3px;
            border-left: none;
            border-top: none;
          }

          .scanning-line {
            width: 80%;
            height: 3px;
            background: var(--primary);
            position: absolute;
            top: 20%;
            box-shadow: 0 0 10px rgba(0, 146, 255, 0.7);
            animation: scanAnimation 2s infinite ease-in-out;
          }

          @keyframes scanAnimation {
            0% { top: 20%; }
            50% { top: 80%; }
            100% { top: 20%; }
          }

          .scanner-footer {
            padding: 1rem;
            text-align: center;
            background-color: #f8f9fa;
            border-top: 1px solid var(--light-gray);
          }

          .scanned-result {
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: #e9ecef;
            border-radius: 6px;
            font-size: 0.9rem;
          }

          .scanned-result strong {
            margin-left: 0.5rem;
            color: var(--primary);
            font-weight: 600;
          }

          .manual-entry {
            display: flex;
            padding: 1rem;
            gap: 0.5rem;
            background-color: #f8f9fa;
            border-top: 1px solid var(--light-gray);
          }

          .manual-input {
            flex: 1;
            padding: 0.75rem;
            border: 1px solid var(--light-gray);
            border-radius: var(--border-radius);
            font-size: 0.9rem;
            transition: var(--transition);
          }

          .manual-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(0, 146, 255, 0.2);
          }

          .manual-submit-btn {
            padding: 0 1.5rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-weight: 500;
            transition: var(--transition);
            white-space: nowrap;
          }

          .manual-submit-btn:disabled {
            background-color: var(--light-gray);
            color: var(--gray);
            cursor: not-allowed;
          }

          .manual-submit-btn:not(:disabled):hover {
            background-color: var(--primary-light);
          }
        `}</style>
      </div>
    </>
  );
};

const SmartPOS1 = () => {
  // Get currency settings from localStorage
  const authData = JSON.parse(localStorage.getItem("authData"));
  const currencySymbol = authData?.currencySettings?.currencySymbol || '$';
  const taxRate = authData?.taxDetails?.gstRate || 0;

  const formatCurrency = (value) => {
    return `${currencySymbol}${(value || 0).toFixed(2)}`;
  };

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState({ categories: true, items: true });
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderStatus, setOrderStatus] = useState(null);
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const scannerRef = useRef(null);
  const [scannedCode, setScannedCode] = useState('');
  
  // Variant state
  const [selectedItemForVariant, setSelectedItemForVariant] = useState(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState({});

  // Toast notification helpers
  const showSuccessToast = (message) => {
    toast.success(message, {
      position: "bottom-center",
      autoClose: 500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  };

  const showErrorToast = (message) => {
    toast.error(message, {
      position: "bottom-center",
      autoClose: 500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const authData = JSON.parse(localStorage.getItem("authData"));
        if (!authData?.token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`${BASE_URL}/api/client-admin/categories`, {
          headers: {
            'Authorization': `Bearer ${authData.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        if (data.status === 200 && data.data) {
          const activeCategories = data.data.filter(category => category.active === true);
          setCategories([{ id: 'All', name: 'All' }, ...activeCategories]);
        } else {
          throw new Error(data.message || 'Failed to fetch categories');
        }
      } catch (err) {
        setError(err.message);
        showErrorToast(err.message);
      } finally {
        setLoading(prev => ({ ...prev, categories: false }));
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchItemsByCategory = async () => {
      try {
        setLoading(prev => ({ ...prev, items: true }));
        const authData = JSON.parse(localStorage.getItem("authData"));
        if (!authData?.token) {
          throw new Error("No authentication token found");
        }

        let url = `${BASE_URL}/api/client-admin/items`;
        if (activeCategory !== 'All') {
          url = `${BASE_URL}/api/client-admin/items/category/${activeCategory}`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${authData.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }

        const data = await response.json();
        if (data.status === 200 && data.data) {
          const activeItems = data.data.filter(item => item.active === true);
          setItems(activeItems);
        } else {
          throw new Error(data.message || 'Failed to fetch items');
        }
      } catch (err) {
        setError(err.message);
        showErrorToast(err.message);
      } finally {
        setLoading(prev => ({ ...prev, items: false }));
      }
    };

    fetchItemsByCategory();
  }, [activeCategory]);

  // Initialize the barcode scanner
  useEffect(() => {
    let initialized = false;

    const initializeScanner = async () => {
      try {
        if (!showScanner || scannerInitialized) return;

        await Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: 480,
              height: 320,
              facingMode: "environment"
            },
          },
          decoder: {
            readers: [
              "ean_reader", "ean_8_reader",
              "code_128_reader", "code_39_reader",
              "codabar_reader", "upc_reader", "upc_e_reader"
            ],
            multiple: false
          },
          locate: true,
          frequency: 10
        }, function (err) {
          if (err) {
            console.error("Scanner initialization failed", err);
            showErrorToast("Failed to initialize scanner. Please check camera permissions.");
            return;
          }
          initialized = true;
          setScannerInitialized(true);
          Quagga.start();
        });

        Quagga.onDetected((result) => {
          if (result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            setScannedCode(code);
            handleBarcodeScan(code);
          }
        });

        Quagga.onProcessed((result) => {
          if (!result) return;

          // Draw detection boxes on the video feed
          const drawingCtx = Quagga.canvas.ctx.overlay;
          const drawingCanvas = Quagga.canvas.dom.overlay;

          drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

          if (result.boxes) {
            result.boxes.filter(box => box !== result.box).forEach(box => {
              Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
            });
          }

          if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "blue", lineWidth: 2 });
          }
        });

      } catch (err) {
        console.error("Scanner error:", err);
        showErrorToast("Scanner error: " + err.message);
      }
    };

    initializeScanner();

    return () => {
      if (initialized) {
        Quagga.offDetected();
        Quagga.offProcessed();
        Quagga.stop();
      }
    };
  }, [showScanner]);

  const openScanner = () => {
    setShowScanner(true);
    setScannedCode('');
    setScannerInitialized(false);
  };

  const closeScanner = () => {
    if (scannerInitialized) {
      Quagga.offDetected();
      Quagga.offProcessed();
      Quagga.stop();
      setScannerInitialized(false);
    }
    setShowScanner(false);
  };

  const handleBarcodeScan = (barcode) => {
    const normalizedBarcode = barcode.replace(/\D/g, '');
    const scannedItem = items.find(item => {
      if (!item.barcode) return false;
      return item.barcode.replace(/\D/g, '') === normalizedBarcode;
    });

    if (scannedItem) {
      if (scannedItem.variants && scannedItem.variants.length > 0) {
        setSelectedItemForVariant(scannedItem);
      } else {
        addToCart(scannedItem);
        scanBeepSound.play();
      }
    } else {
      showErrorToast(`Product not found (Scanned: ${barcode})`);
    }
  };

  const addToCart = (item, selectedOptions = {}) => {
    // Calculate final price with variant modifiers
    let finalPrice = item.price;
    let variantDescription = '';
    
    if (item.variants && item.variants.length > 0) {
      Object.values(selectedOptions).forEach(option => {
        if (option) {
          finalPrice += option.priceModifier || 0;
          variantDescription += `${option.name}, `;
        }
      });
      variantDescription = variantDescription.replace(/,\s*$/, '');
    }

    const cartItem = {
      ...item,
      quantity: 1,
      finalPrice,
      variantDescription,
      variantOptions: selectedOptions
    };

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => 
        cartItem.id === item.id && 
        JSON.stringify(cartItem.variantOptions) === JSON.stringify(selectedOptions)
      );

      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += 1;
        return updatedCart;
      } else {
        return [...prevCart, cartItem];
      }
    });

    showSuccessToast(`${item.name} added to cart`);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => {
      const itemToRemove = prevCart.find(item => item.id === id);
      if (itemToRemove) {
        showSuccessToast(`${itemToRemove.name} removed from cart`);
      }
      return prevCart.filter(item => item.id !== id);
    });
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setNotes('');
    setPaymentMethod('Cash');
    setOrderStatus(null);
    showSuccessToast('Cart cleared');
  };

  const handleVariantSelection = (variantName, option) => {
    setSelectedVariantOptions(prev => ({
      ...prev,
      [variantName]: option
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.finalPrice || item.price) * item.quantity), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount;

  const printPDFInvoice = (base64Pdf, orderNumber) => {
    try {
      const binaryString = atob(base64Pdf);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(blob);

      const printWindow = window.open(pdfUrl);

      if (printWindow) {
        printWindow.onload = () => {
          try {
            printWindow.print();
          } catch (e) {
            console.warn('Auto-print failed, user can print manually', e);
            showErrorToast('Auto-print failed. Please print manually from the opened window.');
          }
        };
      } else {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.download = `invoice_${orderNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccessToast(`Invoice for order #${orderNumber} is ready to print. Please check your downloads or the new tab.`);
      }
    } catch (error) {
      console.error('Error handling PDF invoice:', error);
      showErrorToast('Invoice generated but there was an error opening it automatically. Please contact support.');
    }
  };

  const placeOrder = async () => {
    try {
      setOrderStatus('processing');
      const authData = JSON.parse(localStorage.getItem("authData"));
      if (!authData?.token) {
        throw new Error('No authentication token found');
      }

      const orderItems = cart.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
        price: item.finalPrice || item.price,
        name: item.name,
        variantOptions: item.variantOptions
      }));

      const order = {
        items: orderItems,
        paymentMethod: paymentMethod.toUpperCase(),
        discountAmount: discount,
        customerName: customerName || 'Walk-in Customer',
        notes: notes || ''
      };

      const response = await fetch(`${BASE_URL}/api/client-admin/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify(order)
      });

      const responseData = await response.json();

      if (!response.ok || responseData.status !== 201) {
        throw new Error(responseData.message || 'Failed to place order');
      }

      setOrderStatus('success');
      showSuccessToast('Order placed successfully!');

      if (responseData.data.pdfInvoice) {
        printPDFInvoice(responseData.data.pdfInvoice, responseData.data.orderNumber);
      }
    } catch (err) {
      setOrderStatus('error');
      showErrorToast(`Error placing order: ${err.message}`);
    }
  };

  if (loading.categories || loading.items) {
    return (
      <div className="skeleton-container">
        <div className="skeleton-header">
          <div className="skeleton-logo"></div>
          <div className="skeleton-customer-input"></div>
          <div className="skeleton-payment-method"></div>
          <div className="skeleton-cart-summary"></div>
        </div>

        <div className="skeleton-main">
          <div className="products-section">
            <div className="skeleton-categories">
              {[...Array(6)].map((_, i) => (
                <SkeletonLoader key={`category-${i}`} type="category" />
              ))}
            </div>

            <div className="skeleton-products">
              {[...Array(12)].map((_, i) => (
                <SkeletonLoader key={`product-${i}`} type="product" />
              ))}
            </div>
          </div>

          <div className="skeleton-order-section">
            <div className="skeleton-order-header">
              <div className="skeleton-title"></div>
              <div className="skeleton-clear-btn"></div>
            </div>

            <div className="skeleton-cart-items">
              {[...Array(3)].map((_, i) => (
                <SkeletonLoader key={`cart-item-${i}`} type="cart-item" />
              ))}
            </div>

            <div className="skeleton-summary">
              <div className="skeleton-summary-row"></div>
              <div className="skeleton-summary-row"></div>
              <div className="skeleton-summary-row"></div>
              <div className="skeleton-summary-row total"></div>
            </div>

            <div className="skeleton-actions">
              <div className="skeleton-action-btn"></div>
              <div className="skeleton-action-btn primary"></div>
            </div>
          </div>
        </div>

        <style>{`
          .skeleton-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            border-radius: 10px;
            background-color: #0f172a;
          }
          
          .skeleton-header {
            display: flex;
            flex-direction: column;
            padding: 1rem;
            background-color: rgb(27, 42, 77);
            border-bottom: 1px solid #0f172a;
            gap: 1rem;
          }
          
          .skeleton-logo {
            width: 120px;
            height: 30px;
            background-color: #0f172a;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-customer-input {
            height: 40px;
            background-color: #0f172a;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-payment-method {
            height: 40px;
            background-color: #0f172a;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-cart-summary {
            height: 40px;
            background-color: #0f172a;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-main {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          
          .products-section {
            flex: 1;
            overflow-y: auto;
          }
          
          .skeleton-categories {
            display: flex;
            gap: 0.5rem;
            padding: 1rem;
            overflow-x: auto;
            margin-bottom: 1rem;
          }
          
          .skeleton-category {
            min-width: 80px;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            background-color: rgb(27, 42, 77);
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-products {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1rem;
            padding: 1rem;
          }
          
          .skeleton-product {
            background: rgb(27, 42, 77);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            height: 180px;
            display: flex;
            flex-direction: column;
            border: 1px solid #0f172a;
          }
          
          .skeleton-image {
            height: 120px;
            background-color: #0f172a;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-info {
            padding: 0.5rem;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .skeleton-line {
            height: 12px;
            background-color: #0f172a;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
            margin-bottom: 4px;
          }
          
          .skeleton-line.short {
            width: 70%;
          }
          
          .skeleton-line.very-short {
            width: 40%;
            height: 10px;
          }
          
          .skeleton-order-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            border-top: 1px solid #0f172a;
            background-color: rgb(27, 42, 77);
          }
          
          .skeleton-order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #0f172a;
          }
          
          .skeleton-title {
            width: 100px;
            height: 24px;
            background-color: #0f172a;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-clear-btn {
            width: 70px;
            height: 24px;
            background-color: #0f172a;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-cart-items {
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .skeleton-cart-item {
            display: flex;
            padding: 1rem 0;
            border-bottom: 1px solid #0f172a;
            gap: 1rem;
            align-items: center;
          }
          
          .skeleton-image.small {
            width: 50px;
            height: 50px;
            border-radius: 8px;
          }
          
          .skeleton-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .skeleton-line.medium {
            width: 80%;
          }
          
          .skeleton-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .skeleton-button {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: #0f172a;
            animation: pulse 1.5s infinite ease-in-out;
            border: 1px solid #0f172a;
          }
          
          .skeleton-quantity {
            width: 20px;
            height: 20px;
            background-color: #0f172a;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-total {
            width: 60px;
            height: 20px;
            background-color: #0f172a;
            animation: pulse 1.5s infinite ease-in-out;
            border-radius: 4px;
          }
          
          .skeleton-summary {
            padding: 1rem;
            border-top: 1px solid #0f172a;
            border-bottom: 1px solid #0f172a;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .skeleton-summary-row {
            height: 16px;
            background-color: #0f172a;
            border-radius: 4px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-summary-row.total {
            height: 20px;
            margin-top: 1rem;
          }
          
          .skeleton-actions {
            display: flex;
            padding: 1rem;
            gap: 0.5rem;
          }
          
          .skeleton-action-btn {
            flex: 1;
            height: 40px;
            background-color: #0f172a;
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .skeleton-action-btn.primary {
            background-color: #0f172a;
          }
          
          @keyframes pulse {
            0% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.6;
            }
          }
          
          @media (min-width: 640px) {
            .skeleton-header {
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }
            
            .skeleton-customer-input {
              width: 200px;
            }
            
            .skeleton-payment-method {
              width: 120px;
            }
            
            .skeleton-cart-summary {
              width: 180px;
            }
          }
          
          @media (min-width: 768px) {
            .skeleton-main {
              flex-direction: row;
            }
            
            .skeleton-order-section {
              border-left: 1px solid #0f172a;
              border-top: none;
              max-width: 350px;
            }
          }
          
          @media (min-width: 1024px) {
            .skeleton-order-section {
              max-width: 400px;
            }
            
            .skeleton-products {
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <>
      <ToastContainer
        position="bottom-center"
        autoClose={100}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* Scanner Modal */}
      {showScanner && (
        <div className="scanner-modal">
          <div className="scanner-modal-content">
            <div className="scanner-header">
              <h5 style={{ color: 'white' }}>Barcode Scanner</h5>
              <button onClick={closeScanner} className="close-scanner">
                &times;
              </button>
            </div>
            <div className="scanner-container" ref={scannerRef}>
              {!scannerInitialized ? (
                <div className="scanner-loading">
                  <div className="spinner"></div>
                  <p>Initializing scanner...</p>
                </div>
              ) : (
                <div className="scanner-overlay">
                  <div className="scanning-frame">
                    <div className="corner top-left"></div>
                    <div className="corner top-right"></div>
                    <div className="corner bottom-left"></div>
                    <div className="corner bottom-right"></div>
                  </div>
                  <div className="scanning-line"></div>
                </div>
              )}
            </div>
            <div className="manual-entry">
              <input
                type="text"
                placeholder="Enter barcode manually"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && scannedCode) {
                    handleBarcodeScan(scannedCode);
                  }
                }}
                className="manual-input"
              />
              <button
                onClick={() => {
                  if (scannedCode) {
                    handleBarcodeScan(scannedCode);
                  }
                }}
                className="manual-submit-btn"
                disabled={!scannedCode}
              >
                Add Item
              </button>
            </div>
            <div className="scanner-footer">
              {scannedCode && (
                <div className="scanned-result">
                  <span>Current Code:</span>
                  <strong>{scannedCode}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {selectedItemForVariant && (
        <div className="variant-modal">
          <div className="variant-modal-content">
            <div className="variant-modal-header">
              <h3>{selectedItemForVariant.name}</h3>
              <button 
                onClick={() => {
                  setSelectedItemForVariant(null);
                  setSelectedVariantOptions({});
                }}
                className="close-variant-modal"
              >
                <FiX />
              </button>
            </div>
            <p className="base-price">Base Price: {formatCurrency(selectedItemForVariant.price)}</p>
            
            {selectedItemForVariant.variants.map(variant => (
              <div key={variant.name} className="variant-section">
                <h4>{variant.name} {variant.required && <span className="required-asterisk">*</span>}</h4>
                {variant.description && <p className="variant-description">{variant.description}</p>}
                
                <div className="variant-options">
                  {variant.options.map(option => (
                    <button
                      key={option.name}
                      className={`variant-option ${
                        selectedVariantOptions[variant.name]?.name === option.name ? 'selected' : ''
                      }`}
                      onClick={() => handleVariantSelection(variant.name, option)}
                    >
                      {option.name} (+{formatCurrency(option.priceModifier)})
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="variant-modal-actions">
              <button 
                className="action-btn place-order-btn"
                onClick={() => {
                  addToCart(selectedItemForVariant, selectedVariantOptions);
                  setSelectedItemForVariant(null);
                  setSelectedVariantOptions({});
                }}
                disabled={selectedItemForVariant.variants.some(v => v.required && !selectedVariantOptions[v.name])}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pos-container">
        <div className="pos-header">
          <div className="header-left">
          </div>
          <div className="header-right">
            <div className="customer-input">
              <FiUser className="customer-icon" />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="customer-input-field"
              />
            </div>
            <div className="customer-input">
              <FiEdit className="customer-icon" />
              <input
                type="text"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="customer-input-field"
              />
            </div>
            <div className="payment-method">
              <select
                className="payment-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <button
              className="scanner-btn"
              onClick={openScanner}
              title="Scan barcode"
            >
              <FiCamera className="scanner-icon" />
              <span>Scanner</span>
            </button>
            <div className="cart-summary">
              <FiShoppingCart className="cart-icon" />
              <span>{cart.length} items</span>
              <span className="total-preview">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="pos-main">
          <div className="products-section">
            <div className="category-filter-container">
              <div className="category-filter">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {loading.items ? (
              <div className="loading-items">Loading products...</div>
            ) : (
              <div className="product-grid-container">
                <div className="product-grid">
                  {items.map(item => (
                    <div key={item.id} className="product-card">
                      <div className="product-image">
                        <img
                          src={item.primaryImageUrl || '/images/avatar/1.png'}
                          alt={item.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/avatar/1.png';
                          }}
                        />
                        <button
                          className="add-to-cart-btn"
                          onClick={() => {
                            if (item.variants && item.variants.length > 0) {
                              setSelectedItemForVariant(item);
                            } else {
                              addToCart(item);
                            }
                          }}
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <div className="product-info">
                        <h3>{item.name}</h3>
                        <p className="price">{formatCurrency(item.price)}</p>
                        {item.variants && item.variants.length > 0 && (
                          <p className="has-variants">Has options</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="order-section">
            <div className="order-header">
              <h3>Current Order</h3>
              <button className="clear-cart-btn" onClick={clearCart}>
                Clear All
              </button>
            </div>

            <div className="order-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <FiShoppingCart size={48} />
                  <p>Your cart is empty</p>
                  <small>Add items to get started</small>
                </div>
              ) : (
                <ul>
                  {cart.map(item => (
                    <li key={`${item.id}-${JSON.stringify(item.variantOptions)}`} className="order-item">
                      <div className="item-info">
                        <img
                          src={item.primaryImageUrl || '/images/avatar/1.png'}
                          alt={item.name}
                          className="item-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/avatar/1.png';
                          }}
                        />
                        <div>
                          <p className="item-name">{item.name}</p>
                          {item.variantDescription && (
                            <p className="item-variants">{item.variantDescription}</p>
                          )}
                          <p className="item-price">{formatCurrency(item.finalPrice || item.price)}</p>
                        </div>
                      </div>
                      <div className="item-controls">
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <FiMinus />
                        </button>
                        <span className="item-quantity">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <div className="item-total">
                        {formatCurrency((item.finalPrice || item.price) * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="summary-row">
                <div className="tax-control">
                  <span>Tax: {taxRate}%</span>
                </div>
                <span>{formatCurrency(tax)}</span>
              </div>

              <div className="summary-row discount-row">
                <div>
                  <span>Discount:</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="discount-input"
                  />
                </div>
                <span>-{formatCurrency(discount)}</span>
              </div>

              <div className="summary-row total-row">
                <span>Total:</span>
                <span className="total-amount">{formatCurrency(total)}</span>
              </div>
            </div>

            {orderStatus === 'success' ? (
              <div className="order-success-message">
                <p>Order placed successfully!</p>
                <button
                  onClick={clearCart}
                  className="action-btn new-order-btn"
                >
                  Start New Order
                </button>
              </div>
            ) : (
              <div className="order-actions">
                <button
                  className="action-btn cancel-btn"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Cancel
                </button>
                <button
                  className="action-btn place-order-btn"
                  onClick={placeOrder}
                  disabled={cart.length === 0 || orderStatus === 'processing'}
                >
                  {orderStatus === 'processing' ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
          :root {
            --primary: #0092ff;
            --primary-light: #4895ef;
            --secondary: #3f37c9;
            --success: #0092ff;
            --danger: #f72585;
            --warning: #f8961e;
            --light: #f8f9fa;
            --dark: #212529;
            --gray: #6c757d;
            --light-gray: #e9ecef;
            --border-radius: 8px;
            --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            overflow-x: hidden;
          }

          .pos-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: #0f172a;
            border-radius: 10px;
            box-shadow: var(--box-shadow);
          }
          
          .pos-header {
            display: flex;
            flex-direction: column;
            padding: 1rem;
            background-color: #0f172a;
            border-bottom: 1px solid rgb(19, 32, 59);
            z-index: 10;
          }

          .header-left {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
          }

          .header-right {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            width: 100%;
          }
          
          .customer-input {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
          }

          .customer-icon {
            position: absolute;
            left: 0.75rem;
            color: #0f172a;
          }

          .customer-input-field {
            padding: 0.5rem 1rem 0.5rem 2rem;
            border-radius: var(--border-radius);
            border: 1px solid var(--light-gray);
            font-size: 0.9rem;
            transition: var(--transition);
            width: 100%;
          }

          .customer-input-field:focus {
            outline: none;
            border-color: rgb(19, 32, 59);
            box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
          }

          .payment-method {
            position: relative;
            width: 100%;
          }
          
          .payment-select {
            width: 100%;
            padding: 0.5rem 1rem 0.5rem 0.75rem;
            border-radius: var(--border-radius);
            border: 1px solid rgb(19, 32, 59);
            font-size: 0.9rem;
            appearance: none;
            background-color: #0f172a;
            color: white;
            transition: var(--transition);
          }
          
          .payment-select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
          }

          .cart-summary {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem 1rem;
            background-color: rgb(19, 29, 52);
            border-radius: var(--border-radius);
            cursor: pointer;
            transition: var(--transition);
            width: 100%;
          }

          .cart-icon {
            color: var(--primary);
          }

          .total-preview {
            font-weight: 600;
            color: var(--primary);
          }
          
          .pos-main {
            display: flex;
            flex-direction: column;
            flex: 1;
          }

          .products-section {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            background-color: #0f172a;
          }

          .product-grid-container {
            height: calc(100vh - 200px);
            overflow-y: auto;
            padding-right: 0.5rem;
          }

          .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1rem;
          }

          .order-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            border-top: 1px solid rgb(19, 32, 59);
            background-color: #0f172a;
          }

          .category-filter-container {
            width: 100%;
            overflow-x: auto;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
          }
          
          .category-filter {
            display: flex;
            gap: 0.5rem;
            width: max-content;
            padding-bottom: 0.5rem;
          }
          
          .category-btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: var(--border-radius);
            background-color: rgba(22, 34, 62, 1);
            color: white;
            cursor: pointer;
            transition: var(--transition);
            font-size: 0.85rem;
            white-space: nowrap;
          }
          
          .category-btn.active {
            background-color: var(--primary);
            color: white;
          }
          
          .product-card {
            background: rgba(22, 34, 62, 1);
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: var(--box-shadow);
            transition: var(--transition);
            border: 1px solid rgba(22, 34, 62, 1);
            height: 180px;
            display: flex;
            flex-direction: column;
          }
          
          .product-image {
            height: 120px;
            overflow: hidden;
            position: relative;
            flex-shrink: 0;
          }
          
          .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: var(--transition);
          }

          .add-to-cart-btn {
            position: absolute;
            bottom: 0.5rem;
            right: 0.5rem;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: var(--primary);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--box-shadow);
            transition: var(--transition);
            opacity: 0;
          }

          .product-card:hover .add-to-cart-btn {
            opacity: 1;
          }

          .product-info {
            padding: 0.5rem;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .product-info h3 {
            margin: 0;
            font-size: 0.9rem;
            color: white;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .product-info .price {
            margin: 0.25rem 0 0;
            font-weight: 600;
            color: var(--primary);
            font-size: 0.85rem;
          }

          .has-variants {
            margin: 0.1rem 0 0;
            font-size: 0.7rem;
            color: var(--gray);
            font-style: italic;
          }
          
          .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid rgb(19, 32, 59);
          }

          .order-header h3 {
            font-size: 1.25rem;
            color: white;
          }
          
          .clear-cart-btn {
            background: none;
            border: none;
            color: var(--danger);
            cursor: pointer;
            font-weight: 500;
            font-size: 0.9rem;
            transition: var(--transition);
          }

          .order-items {
            flex: 1;
            overflow-y: auto;
            padding: 0 0rem;
            max-height: 300px;
          }
          
          .empty-cart {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: white;
            text-align: center;
            padding: 2rem;
          }

          .order-item {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid rgb(19, 32, 59);
          }
          
          .item-info {
            display: flex;
            align-items: center;
            flex: 1 1 100%;
            gap: 1rem;
            margin-bottom: 0.5rem;
          }
          
          .item-image {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: var(--border-radius);
          }
          
          .item-name {
            margin: 0;
            font-weight: 500;
            font-size: 0.95rem;
            color: white;
          }

          .item-variants {
            margin: 0.1rem 0 0;
            color: #aaa;
            font-size: 0.8rem;
            font-style: italic;
          }
          
          .item-price {
            margin: 0.25rem 0 0;
            color: white;
            font-size: 0.85rem;
          }
          
          .item-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
            justify-content: center;
          }
          
          .quantity-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 1px solid rgb(19, 32, 59);
            background: #0f172a;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: var(--transition);
          }

          .item-quantity {
            min-width: 20px;
            text-align: center;
            font-size: 0.9rem;
            font-weight: 500;
            color: white;
          }
          
          .item-total {
            flex: 1;
            text-align: right;
            font-weight: 600;
            font-size: 0.95rem;
            color: white;
          }
          
          .order-summary {
            padding: 1rem;
            border-top: 1px solid rgb(19, 32, 59);
            border-bottom: 1px solid rgb(19, 32, 59);
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
            font-size: 0.95rem;
            color: white;
          }

          .tax-control {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .tax-input {
            width: 50px;
            padding: 0.25rem;
            border: 1px solid rgb(19, 32, 59);
            border-radius: 4px;
            text-align: center;
            background-color: #0f172a;
            color: white;
          }
          
          .discount-input {
            width: 70px;
            margin-left: 0.5rem;
            padding: 0.25rem;
            border: 1px solid rgb(19, 32, 59);
            border-radius: 4px;
            background-color: #0f172a;
            color: white;
          }
          
          .total-row {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px dashed rgb(19, 32, 59);
            font-size: 1.1rem;
            font-weight: 600;
          }
          
          .total-amount {
            color: var(--primary);
            font-size: 1.2rem;
          }

          .order-success-message {
            padding: 1rem;
            text-align: center;
            background-color: rgba(76, 201, 240, 0.1);
            border-radius: var(--border-radius);
            margin: 1rem;
          }

          .order-success-message p {
            color: var(--success);
            font-weight: 500;
            margin-bottom: 1rem;
          }

          .new-order-btn {
            background-color: var(--primary);
            color: white;
            width: 100%;
            margin: 0 auto;
            max-width: 200px;
            padding: 0.75rem;
            border: none;
            border-radius: var(--border-radius);
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
          }

          .new-order-btn:hover {
            background-color: var(--primary-light);
          }
          
          .order-actions {
            display: flex;
            padding: 1rem;
            gap: 0.5rem;
          }
          
          .action-btn {
            flex: 1;
            padding: 0.5rem;
            border: none;
            border-radius: var(--border-radius);
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            height: 40px;
            transition: var(--transition);
            font-size: 0.85rem;
          }
          
          .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .cancel-btn {
            background-color: var(--light);
            color: var(--danger);
          }
          
          .place-order-btn {
            background-color: var(--success);
            color: white;
          }

          .loading, .error {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-size: 1.2rem;
          }

          .error {
            color: var(--danger);
          }

          .loading-items {
            display: flex;
            justify-content: center;
            padding: 2rem;
            color: var(--gray);
          }

          /* Scanner Button Styles */
          .scanner-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-weight: 500;
            transition: var(--transition);
            white-space: nowrap;
          }

          .scanner-btn:hover {
            background-color: var(--primary-light);
          }

          .scanner-icon {
            color: white;
          }

          /* Variant Modal Styles */
          .variant-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .variant-modal-content {
            background: #0f172a;
            border-radius: 8px;
            padding: 1.5rem;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            border: 1px solid rgb(19, 32, 59);
          }

          .variant-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .variant-modal-header h3 {
            color: white;
          }

          .close-variant-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--gray);
          }

          .variant-section {
            margin-bottom: 1.5rem;
          }

          .variant-section h4 {
            color: white;
            margin-bottom: 0.5rem;
          }

          .variant-options {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }

          .variant-option {
            padding: 0.5rem 1rem;
            border: 1px solid rgb(19, 32, 59);
            border-radius: 4px;
            background: rgba(22, 34, 62, 1);
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
          }

          .variant-option.selected {
            background-color: var(--primary);
            color: white;
            border-color: var(--primary);
          }

          .variant-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1.5rem;
          }

          .base-price {
            color: var(--primary);
            font-weight: 600;
            margin-bottom: 1rem;
          }

          .variant-description {
            color: #aaa;
            font-size: 0.9rem;
            margin-top: 0.25rem;
          }

          .required-asterisk {
            color: var(--danger);
          }

          @media (min-width: 640px) {
            .pos-header {
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }

            .header-right {
              flex-direction: row;
              align-items: center;
              gap: 1rem;
              width: auto;
            }

            .customer-input {
              width: 200px;
            }

            .payment-method {
              width: 120px;
            }

            .cart-summary {
              width: auto;
            }

            .scanner-btn {
              padding: 0.5rem 1rem;
            }
          }

          @media (min-width: 768px) {
            .pos-main {
              flex-direction: row;
            }

            .order-section {
              border-left: 1px solid rgb(19, 32, 59);
              border-top: none;
              max-width: 350px;
            }

            .order-item {
              flex-wrap: nowrap;
            }

            .item-info {
              flex: 2;
              margin-bottom: 0;
            }

            .action-btn {
              font-size: 0.9rem;
              padding: 0.75rem;
            }

            .product-grid-container {
              height: calc(100vh - 150px);
            }
          }

          @media (min-width: 1024px) {
            .order-section {
              max-width: 400px;
            }

            .product-grid {
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            }
          }

          /* Scanner Modal Styles */
          .scanner-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.04);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .scanner-modal-content {
            background: #0f172a;
            border-radius: 12px;
            width: 95%;
            max-width: 500px;
            overflow: hidden;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
            border: 1px solid rgb(19, 32, 59);
          }

          .scanner-header {
            padding: 1rem;
            background-color: var(--primary);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .scanner-header h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
          }

          .close-scanner {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0 0.5rem;
            transition: var(--transition);
          }

          .close-scanner:hover {
            opacity: 0.8;
          }

          .scanner-container {
            width: 100%;
            height: 300px;
            position: relative;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }

          .scanner-loading {
            color: white;
            text-align: center;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid white;
            border-radius: 50%;
            border-top-color: rgb(19, 29, 52);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .scanner-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .scanning-frame {
            width: 80%;
            height: 150px;
            border: 2px solid gray;
            position: relative;
          }

          .corner {
            position: absolute;
            width: 30px;
            height: 30px;
            border-color: var(--primary);
            border-width: 3px;
            border-style: solid;
          }

          .corner.top-left {
            top: -3px;
            left: -3px;
            border-right: none;
            border-bottom: none;
          }

          .corner.top-right {
            top: -3px;
            right: -3px;
            border-left: none;
            border-bottom: none;
          }

          .corner.bottom-left {
            bottom: -3px;
            left: -3px;
            border-right: none;
            border-top: none;
          }

          .corner.bottom-right {
            bottom: -3px;
            right: -3px;
            border-left: none;
            border-top: none;
          }

          .scanning-line {
            width: 80%;
            height: 3px;
            background: var(--primary);
            position: absolute;
            top: 20%;
            box-shadow: 0 0 10px#0f172a;
            animation: scanAnimation 2s infinite ease-in-out;
          }

          @keyframes scanAnimation {
            0% { top: 20%; }
            50% { top: 80%; }
            100% { top: 20%; }
          }

          .scanner-footer {
            padding: 1rem;
            text-align: center;
            background-color: #0f172a;
            border-top: 1px solid #0f172a;
          }

          .scanned-result {
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: rgb(19, 29, 52);
            border-radius: 6px;
            font-size: 0.9rem;
            color: white;
          }

          .scanned-result strong {
            margin-left: 0.5rem;
            color: var(--primary);
            font-weight: 600;
          }

          .manual-entry {
            display: flex;
            padding: 1rem;
            gap: 0.5rem;
            background-color: #0f172a;
            border-top: 1px solid #0f172a;
          }

          .manual-input {
            flex: 1;
            padding: 0.75rem;
            border: 1px solid rgb(19, 32, 59);
            border-radius: var(--border-radius);
            font-size: 0.9rem;
            transition: var(--transition);
            background-color: #0f172a;
            color: white;
          }

          .manual-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(0, 146, 255, 0.2);
          }

          .manual-submit-btn {
            padding: 0 1.5rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-weight: 500;
            transition: var(--transition);
            white-space: nowrap;
          }

          .manual-submit-btn:disabled {
            background-color: var(--light-gray);
            color: var(--gray);
            cursor: not-allowed;
          }

          .manual-submit-btn:not(:disabled):hover {
            background-color: var(--primary-light);
          }
        `}</style>
      </div>
    </>
  );
};

const getThemeComponent = () => {
  const skinTheme = localStorage.getItem('skinTheme');
  return skinTheme === 'dark' ? SmartPOS1 : SmartPOS;
};

const ThemeSwitcher = () => {
  const [ThemeComponent, setThemeComponent] = useState(getThemeComponent);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentTheme = localStorage.getItem('skinTheme') || 'light';
      const newComponent = currentTheme === 'dark' ? SmartPOS1 : SmartPOS;
      setThemeComponent(() => newComponent);
    }, 200);

    return () => clearInterval(intervalId);
  }, []);

  return <ThemeComponent />;
};

export default ThemeSwitcher;