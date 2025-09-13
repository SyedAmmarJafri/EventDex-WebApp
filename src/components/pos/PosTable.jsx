import { useState, useEffect, useRef } from 'react';
import { FiShoppingCart, FiUser, FiEdit, FiPlus, FiMinus, FiCamera, FiX, FiSearch, FiMail } from 'react-icons/fi';
import { BASE_URL } from '/src/constants.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Quagga from 'quagga';
import Modal from 'react-bootstrap/Modal';
import './SmartPOS.css';

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

const SkeletonLoader1 = ({ type }) => {
  if (type === 'category') {
    return (
      <div className="pos-skeleton-category">
        <div className="pos-skeleton-line"></div>
      </div>
    );
  }

  if (type === 'product') {
    return (
      <div className="pos-skeleton-product">
        <div className="pos-skeleton-image"></div>
        <div className="pos-skeleton-info">
          <div className="pos-skeleton-line short"></div>
          <div className="pos-skeleton-line very-short"></div>
        </div>
      </div>
    );
  }

  if (type === 'cart-item') {
    return (
      <div className="pos-skeleton-cart-item">
        <div className="pos-skeleton-image small"></div>
        <div className="pos-skeleton-details">
          <div className="pos-skeleton-line medium"></div>
          <div className="pos-skeleton-line short"></div>
        </div>
        <div className="pos-skeleton-controls">
          <div className="pos-skeleton-button"></div>
          <div className="pos-skeleton-quantity"></div>
          <div className="pos-skeleton-button"></div>
        </div>
        <div className="pos-skeleton-total"></div>
      </div>
    );
  }

  return (
    <div className="pos-skeleton-default">
      <div className="pos-skeleton-line"></div>
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
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState({ categories: true, items: true, deals: true });
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState();
  const [orderStatus, setOrderStatus] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const scannerRef = useRef(null);
  const [scannedCode, setScannedCode] = useState('');

  // Variant state
  const [selectedItemForVariant, setSelectedItemForVariant] = useState(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState({});

  // Filter items based on search query
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Filter deals based on search query
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchQuery === '' ||
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.barcode && deal.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

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

  const fetchPaymentMethods = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem("authData"));
      if (!authData?.token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${BASE_URL}/api/client-admin/finance/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      if (data.status === 200 && data.data) {
        const activeMethods = data.data.filter(method => method.active === true);
        setPaymentMethods(activeMethods);

        // Set default payment method if available
        const defaultMethod = activeMethods.find(method => method.default) || activeMethods[0];
        if (defaultMethod) {
          setPaymentMethod(defaultMethod.name);
        }
      } else {
        throw new Error(data.message || 'Failed to fetch payment methods');
      }
    } catch (err) {
      console.error("Error fetching payment methods:", err);
      showErrorToast(err.message);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(prev => ({ ...prev, deals: true }));
      const authData = JSON.parse(localStorage.getItem("authData"));
      if (!authData?.token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${BASE_URL}/api/client-admin/deals`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      if (data.status === 200 && data.data) {
        const activeDeals = data.data.filter(deal => deal.active === true);
        setDeals(activeDeals);
      } else {
        throw new Error(data.message || 'Failed to fetch deals');
      }
    } catch (err) {
      setError(err.message);
      showErrorToast(err.message);
    } finally {
      setLoading(prev => ({ ...prev, deals: false }));
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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
          setCategories([
            { id: 'All', name: 'All' },
            { id: 'Deals', name: 'Deals' },
            ...activeCategories
          ]);
          fetchDeals();
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
        if (activeCategory !== 'All' && activeCategory !== 'Deals') {
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

    if (activeCategory !== 'Deals') {
      fetchItemsByCategory();
    }
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

    // First check items
    const scannedItem = items.find(item => {
      if (!item.barcode) return false;
      return item.barcode.replace(/\D/g, '') === normalizedBarcode;
    });

    if (scannedItem) {
      if (scannedItem.quantity <= 0) {
        showErrorToast(`${scannedItem.name} is out of stock`);
        return;
      }
      if (scannedItem.variants && scannedItem.variants.length > 0) {
        setSelectedItemForVariant(scannedItem);
      } else {
        addToCart(scannedItem);
        scanBeepSound.play();
      }
      return;
    }

    // Then check deals
    const scannedDeal = deals.find(deal => {
      if (!deal.barcode) return false;
      return deal.barcode.replace(/\D/g, '') === normalizedBarcode;
    });

    if (scannedDeal) {
      addToCart({
        ...scannedDeal,
        isDeal: true,
        finalPrice: scannedDeal.price,
        primaryImageUrl: scannedDeal.imageUrl
      });
      scanBeepSound.play();
      return;
    }

    showErrorToast(`Product not found (Scanned: ${barcode})`);
  };

  const addToCart = (item, selectedOptions = {}) => {
    // Calculate final price with variant modifiers
    let finalPrice = item.price;
    let variantDescription = '';

    // Convert selectedOptions to the required selectedVariants format
    const selectedVariants = [];

    Object.entries(selectedOptions).forEach(([variantName, option]) => {
      if (option) {
        // Handle both single option and array of options
        if (Array.isArray(option)) {
          option.forEach(opt => {
            if (opt) {
              finalPrice += opt.priceModifier || 0;
              variantDescription += `${opt.name}, `;
              selectedVariants.push({
                variantName,
                selectedOption: opt.name
              });
            }
          });
        } else {
          finalPrice += option.priceModifier || 0;
          variantDescription += `${option.name}, `;
          selectedVariants.push({
            variantName,
            selectedOption: option.name
          });
        }
      }
    });

    variantDescription = variantDescription.replace(/,\s*$/, '');

    const cartItem = {
      ...item,
      quantity: 1,
      finalPrice,
      variantDescription,
      selectedVariants // Store in the required format
    };

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem =>
        cartItem.id === item.id &&
        JSON.stringify(cartItem.selectedVariants) === JSON.stringify(selectedVariants)
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
    setCustomerEmail('');
    setNotes('');
    setPaymentMethod('Cash');
    setOrderStatus(null);
    showSuccessToast('Cart cleared');
  };

  const handleVariantSelection = (variantName, option, isRequired) => {
    setSelectedVariantOptions(prev => {
      // For required variants (single selection)
      if (isRequired) {
        return {
          ...prev,
          [variantName]: option
        };
      }
      
      // For non-required variants (multiple selection)
      const currentOptions = prev[variantName] || [];
      
      // Check if option is already selected
      const isSelected = Array.isArray(currentOptions) 
        ? currentOptions.some(opt => opt.name === option.name)
        : false;
      
      if (isSelected) {
        // Remove the option if it's already selected
        const newOptions = Array.isArray(currentOptions)
          ? currentOptions.filter(opt => opt.name !== option.name)
          : [];
        return {
          ...prev,
          [variantName]: newOptions.length > 0 ? newOptions : null
        };
      } else {
        // Add the option if it's not selected
        const newOptions = Array.isArray(currentOptions)
          ? [...currentOptions, option]
          : [option];
        return {
          ...prev,
          [variantName]: newOptions
        };
      }
    });
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

      const orderItems = cart
        .filter(item => !item.isDeal)  // Only include non-deal items
        .map(item => ({
          quantity: item.quantity,
          itemId: item.id,
          selectedVariants: item.selectedVariants || []
        }));

      const orderDeals = cart
        .filter(item => item.isDeal)  // Only include deal items
        .map(item => ({
          quantity: item.quantity,
          dealId: item.id
        }));

      const order = {
        items: orderItems,
        deals: orderDeals,
        paymentMethod: paymentMethod,
        discountAmount: discount,
        customerName: customerName || 'Walk-in Customer',
        notes: notes || '',
        customerContact: customerEmail || ''
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

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400 && responseData.error) {
          throw new Error(responseData.error);
        }
        throw new Error(responseData.message || 'Failed to place order');
      }

      if (responseData.status !== 201) {
        throw new Error(responseData.message || 'Order was not created successfully');
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

  if (loading.categories || loading.items || loading.deals) {
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
      <Modal show={showScanner} onHide={closeScanner} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Barcode Scanner</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
          {scannedCode && (
            <div className="scanner-footer">
              <div className="scanned-result">
                <span>Current Code:</span>
                <strong>{scannedCode}</strong>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal show={!!selectedItemForVariant} onHide={() => {
        setSelectedItemForVariant(null);
        setSelectedVariantOptions({});
      }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{selectedItemForVariant?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="base-price">Base Price: {formatCurrency(selectedItemForVariant?.price)}</p>

          {selectedItemForVariant?.variants.map(variant => (
            <div key={variant.name} className="variant-section">
              <h4>{variant.name} {variant.required && <span className="required-asterisk">*</span>}</h4>
              {variant.description && <p className="variant-description">{variant.description}</p>}

              <div className="variant-options">
                {variant.options.map(option => {
                  const isSelected = variant.required 
                    ? selectedVariantOptions[variant.name]?.name === option.name
                    : (selectedVariantOptions[variant.name] || []).some(opt => opt?.name === option.name);
                  
                  return (
                    <button
                      key={option.name}
                      className={`variant-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleVariantSelection(variant.name, option, variant.required)}
                    >
                      {option.name} (+{formatCurrency(option.priceModifier)})
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <button
            className="action-btn place-order-btn"
            onClick={() => {
              addToCart(selectedItemForVariant, selectedVariantOptions);
              setSelectedItemForVariant(null);
              setSelectedVariantOptions({});
            }}
            disabled={
              selectedItemForVariant?.variants.some(v => 
                v.required && !selectedVariantOptions[v.name]
              )
            }
          >
            Add to Cart
          </button>
        </Modal.Footer>
      </Modal>

      <div className="pos-container">
        <div className="pos-header" style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e9ecef'
        }}>
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
              <FiMail className="customer-icon" />
              <input
                type="email"
                placeholder="Customer Email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
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
                {paymentMethods
                  .filter(method => method.active === true)
                  .map(method => (
                    <option key={method.id} value={method.name}>
                      {method.name}
                    </option>
                  ))}
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
            <div className="search-container">
              <div className="search-input">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-field"
                />
                {searchQuery && (
                  <button
                    className="clear-search"
                    onClick={() => setSearchQuery('')}
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
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

            {loading.items && activeCategory !== 'Deals' ? (
              <div className="loading-items">Loading products...</div>
            ) : (
              <div className="product-grid-container">
                <div className="product-grid">
                  {activeCategory === 'Deals' ? (
                    filteredDeals.length > 0 ? (
                      filteredDeals.map(deal => (
                        <div key={deal.id} className="product-card">
                          <div className="product-image">
                            <img
                              src={deal.imageUrl || '/images/avatar/undefined.png'}
                              alt={deal.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/avatar/undefined.png';
                              }}
                            />
                            <button
                              className="add-to-cart-btn"
                              onClick={() => {
                                addToCart({
                                  ...deal,
                                  isDeal: true,
                                  finalPrice: deal.price,
                                  primaryImageUrl: deal.imageUrl
                                });
                              }}
                            >
                              <FiPlus />
                            </button>
                          </div>
                          <div className="product-info">
                            <h3>{deal.name}</h3>
                            <p className="price">{formatCurrency(deal.price)}</p>
                            <p className="deal-items">{deal.items.length} items included</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">
                        {searchQuery ? 'No matching deals found' : 'No deals available'}
                      </div>
                    )
                  ) : (
                    filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <div key={item.id} className="product-card">
                          <div className="product-image">
                            <img
                              src={item.primaryImageUrl || '/images/avatar/undefined.png'}
                              alt={item.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/avatar/undefined.png';
                              }}
                            />
                            {item.quantity <= 0 && (
                              <div className="out-of-stock-overlay">
                                <span>Out of Stock</span>
                              </div>
                            )}
                            <button
                              className={`add-to-cart-btn ${item.quantity <= 0 ? 'disabled' : ''}`}
                              onClick={() => {
                                if (item.quantity <= 0) return;
                                if (item.variants && item.variants.length > 0) {
                                  setSelectedItemForVariant(item);
                                } else {
                                  addToCart(item);
                                }
                              }}
                              disabled={item.quantity <= 0}
                            >
                              <FiPlus />
                            </button>
                          </div>
                          <div className="product-info">
                            <h3>{item.name}</h3>
                            <p className="price">{formatCurrency(item.price)}</p>
                            <p className="stock-quantity">
                              {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">
                        {searchQuery ? 'No matching items found' : 'No items available in this category'}
                      </div>
                    )
                  )}
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
                          src={item.primaryImageUrl || item.imageUrl || '/images/avatar/undefined.png'}
                          alt={item.name}
                          className="item-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/avatar/undefined.png';
                          }}
                        />
                        <div>
                          <p className="item-name">{item.name}</p>
                          {item.variantDescription && (
                            <p className="item-variants">{item.variantDescription}</p>
                          )}
                          {item.isDeal && (
                            <p className="deal-badge">Deal</p>
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
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState({ categories: true, items: true, deals: true });
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState();
  const [orderStatus, setOrderStatus] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const scannerRef = useRef(null);
  const [scannedCode, setScannedCode] = useState('');

  // Variant state
  const [selectedItemForVariant, setSelectedItemForVariant] = useState(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState({});

  // Filter items based on search query
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Filter deals based on search query
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchQuery === '' ||
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.barcode && deal.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

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

  const fetchPaymentMethods = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem("authData"));
      if (!authData?.token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${BASE_URL}/api/client-admin/finance/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      if (data.status === 200 && data.data) {
        const activeMethods = data.data.filter(method => method.active === true);
        setPaymentMethods(activeMethods);

        // Set default payment method if available
        const defaultMethod = activeMethods.find(method => method.default) || activeMethods[0];
        if (defaultMethod) {
          setPaymentMethod(defaultMethod.name);
        }
      } else {
        throw new Error(data.message || 'Failed to fetch payment methods');
      }
    } catch (err) {
      console.error("Error fetching payment methods:", err);
      showErrorToast(err.message);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(prev => ({ ...prev, deals: true }));
      const authData = JSON.parse(localStorage.getItem("authData"));
      if (!authData?.token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${BASE_URL}/api/client-admin/deals`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const data = await response.json();
      if (data.status === 200 && data.data) {
        const activeDeals = data.data.filter(deal => deal.active === true);
        setDeals(activeDeals);
      } else {
        throw new Error(data.message || 'Failed to fetch deals');
      }
    } catch (err) {
      setError(err.message);
      showErrorToast(err.message);
    } finally {
      setLoading(prev => ({ ...prev, deals: false }));
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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
          setCategories([
            { id: 'All', name: 'All' },
            { id: 'Deals', name: 'Deals' },
            ...activeCategories
          ]);
          fetchDeals();
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
        if (activeCategory !== 'All' && activeCategory !== 'Deals') {
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

    if (activeCategory !== 'Deals') {
      fetchItemsByCategory();
    }
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

    // First check items
    const scannedItem = items.find(item => {
      if (!item.barcode) return false;
      return item.barcode.replace(/\D/g, '') === normalizedBarcode;
    });

    if (scannedItem) {
      if (scannedItem.quantity <= 0) {
        showErrorToast(`${scannedItem.name} is out of stock`);
        return;
      }
      if (scannedItem.variants && scannedItem.variants.length > 0) {
        setSelectedItemForVariant(scannedItem);
      } else {
        addToCart(scannedItem);
        scanBeepSound.play();
      }
      return;
    }

    // Then check deals
    const scannedDeal = deals.find(deal => {
      if (!deal.barcode) return false;
      return deal.barcode.replace(/\D/g, '') === normalizedBarcode;
    });

    if (scannedDeal) {
      addToCart({
        ...scannedDeal,
        isDeal: true,
        finalPrice: scannedDeal.price,
        primaryImageUrl: scannedDeal.imageUrl
      });
      scanBeepSound.play();
      return;
    }

    showErrorToast(`Product not found (Scanned: ${barcode})`);
  };

  const addToCart = (item, selectedOptions = {}) => {
    // Calculate final price with variant modifiers
    let finalPrice = item.price;
    let variantDescription = '';

    // Convert selectedOptions to the required selectedVariants format
    const selectedVariants = [];

    Object.entries(selectedOptions).forEach(([variantName, option]) => {
      if (option) {
        // Handle both single option and array of options
        if (Array.isArray(option)) {
          option.forEach(opt => {
            if (opt) {
              finalPrice += opt.priceModifier || 0;
              variantDescription += `${opt.name}, `;
              selectedVariants.push({
                variantName,
                selectedOption: opt.name
              });
            }
          });
        } else {
          finalPrice += option.priceModifier || 0;
          variantDescription += `${option.name}, `;
          selectedVariants.push({
            variantName,
            selectedOption: option.name
          });
        }
      }
    });

    variantDescription = variantDescription.replace(/,\s*$/, '');

    const cartItem = {
      ...item,
      quantity: 1,
      finalPrice,
      variantDescription,
      selectedVariants // Store in the required format
    };

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem =>
        cartItem.id === item.id &&
        JSON.stringify(cartItem.selectedVariants) === JSON.stringify(selectedVariants)
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
    setCustomerEmail('');
    setNotes('');
    setPaymentMethod('Cash');
    setOrderStatus(null);
    showSuccessToast('Cart cleared');
  };

  const handleVariantSelection = (variantName, option, isRequired) => {
    setSelectedVariantOptions(prev => {
      // For required variants (single selection)
      if (isRequired) {
        return {
          ...prev,
          [variantName]: option
        };
      }
      
      // For non-required variants (multiple selection)
      const currentOptions = prev[variantName] || [];
      
      // Check if option is already selected
      const isSelected = Array.isArray(currentOptions) 
        ? currentOptions.some(opt => opt.name === option.name)
        : false;
      
      if (isSelected) {
        // Remove the option if it's already selected
        const newOptions = Array.isArray(currentOptions)
          ? currentOptions.filter(opt => opt.name !== option.name)
          : [];
        return {
          ...prev,
          [variantName]: newOptions.length > 0 ? newOptions : null
        };
      } else {
        // Add the option if it's not selected
        const newOptions = Array.isArray(currentOptions)
          ? [...currentOptions, option]
          : [option];
        return {
          ...prev,
          [variantName]: newOptions
        };
      }
    });
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

      const orderItems = cart
        .filter(item => !item.isDeal)  // Only include non-deal items
        .map(item => ({
          quantity: item.quantity,
          itemId: item.id,
          selectedVariants: item.selectedVariants || []
        }));

      const orderDeals = cart
        .filter(item => item.isDeal)  // Only include deal items
        .map(item => ({
          quantity: item.quantity,
          dealId: item.id
        }));

      const order = {
        items: orderItems,
        deals: orderDeals,
        paymentMethod: paymentMethod,
        discountAmount: discount,
        customerName: customerName || 'Walk-in Customer',
        notes: notes || '',
        customerContact: customerEmail || ''
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

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400 && responseData.error) {
          throw new Error(responseData.error);
        }
        throw new Error(responseData.message || 'Failed to place order');
      }

      if (responseData.status !== 201) {
        throw new Error(responseData.message || 'Order was not created successfully');
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

  if (loading.categories || loading.items || loading.deals) {
    return (
      <div className="pos-skeleton-container">
        <div className="pos-skeleton-header">
          <div className="pos-skeleton-logo"></div>
          <div className="pos-skeleton-customer-input"></div>
          <div className="pos-skeleton-payment-method"></div>
          <div className="pos-skeleton-cart-summary"></div>
        </div>

        <div className="pos-skeleton-main">
          <div className="pos-skeleton-products-section">
            <div className="pos-skeleton-categories">
              {[...Array(6)].map((_, i) => (
                <SkeletonLoader1 key={`category-${i}`} type="category" />
              ))}
            </div>

            <div className="pos-skeleton-products">
              {[...Array(12)].map((_, i) => (
                <SkeletonLoader1 key={`product-${i}`} type="product" />
              ))}
            </div>
          </div>

          <div className="pos-skeleton-order-section">
            <div className="pos-skeleton-order-header">
              <div className="pos-skeleton-title"></div>
              <div className="pos-skeleton-clear-btn"></div>
            </div>

            <div className="pos-skeleton-cart-items">
              {[...Array(3)].map((_, i) => (
                <SkeletonLoader1 key={`cart-item-${i}`} type="cart-item" />
              ))}
            </div>

            <div className="pos-skeleton-summary">
              <div className="pos-skeleton-summary-row"></div>
              <div className="pos-skeleton-summary-row"></div>
              <div className="pos-skeleton-summary-row"></div>
              <div className="pos-skeleton-summary-row total"></div>
            </div>

            <div className="pos-skeleton-actions">
              <div className="pos-skeleton-action-btn"></div>
              <div className="pos-skeleton-action-btn primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="pos-error">Error: {error}</div>;
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
      <Modal show={showScanner} onHide={closeScanner} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Barcode Scanner</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="pos-scanner-container" ref={scannerRef}>
            {!scannerInitialized ? (
              <div className="pos-scanner-loading">
                <div className="pos-spinner"></div>
                <p>Initializing scanner...</p>
              </div>
            ) : (
              <div className="pos-scanner-overlay">
                <div className="pos-scanning-frame">
                  <div className="pos-corner pos-top-left"></div>
                  <div className="pos-corner pos-top-right"></div>
                  <div className="pos-corner pos-bottom-left"></div>
                  <div className="pos-corner pos-bottom-right"></div>
                </div>
                <div className="pos-scanning-line"></div>
              </div>
            )}
          </div>
          <div className="pos-manual-entry">
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
              className="pos-manual-input"
            />
            <button
              onClick={() => {
                if (scannedCode) {
                  handleBarcodeScan(scannedCode);
                }
              }}
              className="pos-manual-submit-btn"
              disabled={!scannedCode}
            >
              Add Item
            </button>
          </div>
          {scannedCode && (
            <div className="pos-scanner-footer">
              <div className="pos-scanned-result">
                <span>Current Code:</span>
                <strong>{scannedCode}</strong>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal show={!!selectedItemForVariant} onHide={() => {
        setSelectedItemForVariant(null);
        setSelectedVariantOptions({});
      }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{selectedItemForVariant?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="pos-base-price">Base Price: {formatCurrency(selectedItemForVariant?.price)}</p>

          {selectedItemForVariant?.variants.map(variant => (
            <div key={variant.name} className="pos-variant-section">
              <h4>{variant.name} {variant.required && <span className="pos-required-asterisk">*</span>}</h4>
              {variant.description && <p className="pos-variant-description">{variant.description}</p>}

              <div className="pos-variant-options">
                {variant.options.map(option => {
                  const isSelected = variant.required 
                    ? selectedVariantOptions[variant.name]?.name === option.name
                    : (selectedVariantOptions[variant.name] || []).some(opt => opt?.name === option.name);
                  
                  return (
                    <button
                      key={option.name}
                      className={`pos-variant-option ${isSelected ? 'pos-selected' : ''}`}
                      onClick={() => handleVariantSelection(variant.name, option, variant.required)}
                    >
                      {option.name} (+{formatCurrency(option.priceModifier)})
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <button
            className="pos-action-btn pos-place-order-btn"
            onClick={() => {
              addToCart(selectedItemForVariant, selectedVariantOptions);
              setSelectedItemForVariant(null);
              setSelectedVariantOptions({});
            }}
            disabled={
              selectedItemForVariant?.variants.some(v => 
                v.required && !selectedVariantOptions[v.name]
              )
            }
          >
            Add to Cart
          </button>
        </Modal.Footer>
      </Modal>

      <div className="pos1-container">
        <div className="pos-header">
          <div className="pos-header-left">
          </div>
          <div className="pos-header-right">
            <div className="pos-customer-input">
              <FiUser className="pos-customer-icon" />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pos-customer-input-field"
              />
            </div>
            <div className="pos-customer-input">
              <FiMail className="pos-customer-icon" />
              <input
                type="email"
                placeholder="Customer Email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="pos-customer-input-field"
              />
            </div>
            <div className="pos-customer-input">
              <FiEdit className="pos-customer-icon" />
              <input
                type="text"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="pos-customer-input-field"
              />
            </div>
            <div className="pos-payment-method">
              <select
                className="pos-payment-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {paymentMethods
                  .filter(method => method.active === true)
                  .map(method => (
                    <option key={method.id} value={method.name}>
                      {method.name}
                    </option>
                  ))}
              </select>
            </div>
            <button
              className="pos-scanner-btn"
              onClick={openScanner}
              title="Scan barcode"
            >
              <FiCamera className="pos-scanner-icon" />
              <span>Scanner</span>
            </button>
            <div className="pos-cart-summary">
              <FiShoppingCart className="pos-cart-icon" />
              <span>{cart.length} items</span>
              <span className="pos-total-preview">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="pos-main">
          <div className="pos-products-section">
            <div className="pos-search-container">
              <div className="pos-search-input">
                <FiSearch className="pos-search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pos-search-field"
                />
                {searchQuery && (
                  <button
                    className="pos-clear-search"
                    onClick={() => setSearchQuery('')}
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
            <div className="pos-category-filter-container">
              <div className="pos-category-filter">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`pos-category-btn ${activeCategory === category.id ? 'pos-active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {loading.items && activeCategory !== 'Deals' ? (
              <div className="pos-loading-items">Loading products...</div>
            ) : (
              <div className="pos-product-grid-container">
                <div className="pos-product-grid">
                  {activeCategory === 'Deals' ? (
                    filteredDeals.length > 0 ? (
                      filteredDeals.map(deal => (
                        <div key={deal.id} className="pos-product-card">
                          <div className="pos-product-image">
                            <img
                              src={deal.imageUrl || '/images/avatar/undefined.png'}
                              alt={deal.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/avatar/undefined.png';
                              }}
                            />
                            <button
                              className="pos-add-to-cart-btn"
                              onClick={() => {
                                addToCart({
                                  ...deal,
                                  isDeal: true,
                                  finalPrice: deal.price,
                                  primaryImageUrl: deal.imageUrl
                                });
                              }}
                            >
                              <FiPlus />
                            </button>
                          </div>
                          <div className="pos-product-info">
                            <h3>{deal.name}</h3>
                            <p className="pos-price">{formatCurrency(deal.price)}</p>
                            <p className="pos-deal-items">{deal.items.length} items included</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="pos-no-results">
                        {searchQuery ? 'No matching deals found' : 'No deals available'}
                      </div>
                    )
                  ) : (
                    filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <div key={item.id} className="pos-product-card">
                          <div className="pos-product-image">
                            <img
                              src={item.primaryImageUrl || '/images/avatar/undefined.png'}
                              alt={item.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/avatar/undefined.png';
                              }}
                            />
                            {item.quantity <= 0 && (
                              <div className="pos-out-of-stock-overlay">
                                <span>Out of Stock</span>
                              </div>
                            )}
                            <button
                              className={`pos-add-to-cart-btn ${item.quantity <= 0 ? 'pos-disabled' : ''}`}
                              onClick={() => {
                                if (item.quantity <= 0) return;
                                if (item.variants && item.variants.length > 0) {
                                  setSelectedItemForVariant(item);
                                } else {
                                  addToCart(item);
                                }
                              }}
                              disabled={item.quantity <= 0}
                            >
                              <FiPlus />
                            </button>
                          </div>
                          <div className="pos-product-info">
                            <h3>{item.name}</h3>
                            <p className="pos-price">{formatCurrency(item.price)}</p>
                            <p className="pos-stock-quantity">
                              {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="pos-no-results">
                        {searchQuery ? 'No matching items found' : 'No items available in this category'}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pos-order-section">
            <div className="pos-order-header">
              <h3>Current Order</h3>
              <button className="pos-clear-cart-btn" onClick={clearCart}>
                Clear All
              </button>
            </div>

            <div className="pos-order-items">
              {cart.length === 0 ? (
                <div className="pos-empty-cart">
                  <FiShoppingCart size={48} />
                  <p>Your cart is empty</p>
                  <small>Add items to get started</small>
                </div>
              ) : (
                <ul>
                  {cart.map(item => (
                    <li key={`${item.id}-${JSON.stringify(item.variantOptions)}`} className="pos-order-item">
                      <div className="pos-item-info">
                        <img
                          src={item.primaryImageUrl || item.imageUrl || '/images/avatar/undefined.png'}
                          alt={item.name}
                          className="pos-item-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/avatar/undefined.png';
                          }}
                        />
                        <div>
                          <p className="pos-item-name">{item.name}</p>
                          {item.variantDescription && (
                            <p className="pos-item-variants">{item.variantDescription}</p>
                          )}
                          {item.isDeal && (
                            <p className="pos-deal-badge">Deal</p>
                          )}
                          <p className="pos-item-price">{formatCurrency(item.finalPrice || item.price)}</p>
                        </div>
                      </div>
                      <div className="pos-item-controls">
                        <button
                          className="pos-quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <FiMinus />
                        </button>
                        <span className="pos-item-quantity">{item.quantity}</span>
                        <button
                          className="pos-quantity-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <div className="pos-item-total">
                        {formatCurrency((item.finalPrice || item.price) * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pos-order-summary">
              <div className="pos-summary-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="pos-summary-row">
                <div className="pos-tax-control">
                  <span>Tax: {taxRate}%</span>
                </div>
                <span>{formatCurrency(tax)}</span>
              </div>

              <div className="pos-summary-row pos-discount-row">
                <div>
                  <span>Discount:</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="pos-discount-input"
                  />
                </div>
                <span>-{formatCurrency(discount)}</span>
              </div>

              <div className="pos-summary-row pos-total-row">
                <span>Total:</span>
                <span className="pos-total-amount">{formatCurrency(total)}</span>
              </div>
            </div>

            {orderStatus === 'success' ? (
              <div className="pos-order-success-message">
                <p>Order placed successfully!</p>
                <button
                  onClick={clearCart}
                  className="pos-action-btn pos-new-order-btn"
                >
                  Start New Order
                </button>
              </div>
            ) : (
              <div className="pos-order-actions">
                <button
                  className="pos-action-btn pos-cancel-btn"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Cancel
                </button>
                <button
                  className="pos-action-btn pos-place-order-btn"
                  onClick={placeOrder}
                  disabled={cart.length === 0 || orderStatus === 'processing'}
                >
                  {orderStatus === 'processing' ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            )}
          </div>
        </div>
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