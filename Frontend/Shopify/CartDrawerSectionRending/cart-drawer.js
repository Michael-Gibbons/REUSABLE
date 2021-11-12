theme.CartDrawer = class CartDrawer {
  constructor() {
    this.selectors = {
      cartDrawerOuter: 'data-dynamic-render-cart-drawer',//needed to replace template
      cartDrawer: 'data-cart-drawer',
      cartItemCount: 'data-cart-count',
      loader: 'data-drawer-add-loader',
      id: 'cart-drawer',//section-id
      qtyInput: '#fproduct'
    }

    this.triggers = {
      open: 'data-cart-drawer-open',
      close: 'data-cart-drawer-close',
      remove: 'data-cart-drawer-line-item-remove',
      qtyAdjust: 'data-cart-drawer-line-item-qty-adjust',
      atc: 'data-cart-drawer-add'
    }

    this.classes = {
      open: 'cart-drawer--open'
    }

    this.lineItem = {
      id: 'data-id',
      line: 'data-line'
    }

    // add selectors you want to hide when the cart drawer opens, chat widgets, popups etc
    //ex: #stupid-chat-widget, .dumb-dumb-idiot-popup
    this.elementsToHide = ['#stupid-chat-widget', '.dumb-dumb-idiot-popup'];
  }

  //------------ HELPERS ---------------------

  hideOnTopElements(){
    function hideElement(el){
      const elementToHide = document.querySelector(el)
      if(elementToHide){
        elementToHide.style.display = 'none';
      }
    }

    this.elementsToHide.forEach((elementToHide) => {
      this.waitForElementToDisplay(elementToHide, () => hideElement(elementToHide), 100, 10000)
    })
  }

  showOnTopElements(){
    function showElement(el){
      const elementToShow = document.querySelector(el);
      if(elementToShow){
        elementToShow.style.display = 'unset';
      }
    }

    this.elementsToHide.forEach((elementToShow) => {
      showElement(elementToShow)
    })
  }

  //polls dom for element, fires callback once found
  waitForElementToDisplay(selector, callback, checkFrequencyInMs, timeoutInMs) {
    const startTimeInMs = Date.now();
    (function loopSearch() {
      if (document.querySelector(selector) != null) {
        callback();
        return;
      }
      else {
        setTimeout(function () {
          if (timeoutInMs && Date.now() - startTimeInMs > timeoutInMs)
            return;
          loopSearch();
        }, checkFrequencyInMs);
      }
    })();
  }

  async postData(url = '', data = {}) {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(data)
    });
    return response.json();
  }

  toggleLoading(bool){
    if(bool){
      document.querySelector(`[${this.selectors.loader}]`)?.classList.remove('hide')
    }else{
      document.querySelector(`[${this.selectors.loader}]`)?.classList.add('hide')
    }
  }

  //------------ END HELPERS -----------------


  //------------ ACTIONS ---------------------

  openCartDrawer(){
    this.hideOnTopElements();
    document.querySelector('body').style.overflow = 'hidden';
    document.querySelector(`[${this.selectors.cartDrawer}]`).classList.add(this.classes.open)
  }

  closeCartDrawer(){
    this.showOnTopElements();
    document.querySelector('body').style.overflow = 'auto';
    document.querySelector(`[${this.selectors.cartDrawer}]`).classList.remove(this.classes.open)
  }

  async removeItem(event){
    const data = {
      id: event.target.getAttribute(this.lineItem.id),
      line: event.target.getAttribute(this.lineItem.line),
      quantity: "0"
    }

    return this.postData('/cart/change.js?sections=cart-drawer', data);
  }

  async adjustItemQty(event){
    const data = {
      id: event.target.getAttribute(this.lineItem.id),
      line: event.target.getAttribute(this.lineItem.line),
      quantity: event.target.getAttribute(this.triggers.qtyAdjust)
    }

    return this.postData('/cart/change.js?sections=cart-drawer', data);
  }

  addItem(event){
    const id = event.target.closest(`[${this.triggers.atc}]`).getAttribute(this.triggers.atc);
    const quantity = document.querySelector(this.selectors.qtyInput).value
    const data = {
      items: [{
        id: id,
        quantity: quantity
      }]
    }

    return this.postData('/cart/add.js?sections=cart-drawer', data);
  }

  async updateCartTemplate(template){
    if(!template){
      await fetch('/?sections=cart-drawer').then(response => response.json()).then(data => {
        template = data[this.selectors.id]
      })
    }

    document.querySelector(`[${this.selectors.cartDrawerOuter}]`).innerHTML = template;

    fetch('/cart.js').then(response => response.json()).then(data => {
      this.updateCartCountBubble(data.item_count)
    });

    this.rebuyInit();
    this.openCartDrawer();
  }

  updateCartCountBubble(qty){
    document.querySelector(`[${this.selectors.cartItemCount}]`).innerHTML = qty;
  }

  //------------ END ACTIONS -----------------

  //------------ LISTENERS -------------------

  initializeOpenDrawerButtons(){

    document.addEventListener('cartDrawer:open', this.openCartDrawer.bind(this));

    document.addEventListener('click', (event) => {
      if(event.target.closest(`[${this.triggers.open}]`) != undefined){
        //custom event abstraction to hook onto
        const openCartDrawerEvent = new CustomEvent('cartDrawer:open', {detail: {}});
        document.dispatchEvent(openCartDrawerEvent)
      }
    })
  }

  initializeCloseDrawerButtons(){

    document.addEventListener('cartDrawer:close', this.closeCartDrawer.bind(this));

    document.addEventListener('click', (event) => {
      if(event.target.closest(`[${this.triggers.close}]`) != undefined){
        //custom event abstraction to hook onto
        const closeCartDrawerEvent = new CustomEvent('cartDrawer:close', {detail: {}});
        document.dispatchEvent(closeCartDrawerEvent)
      }
    })
  }

  initializeDrawerRemoveButtons(){
    document.addEventListener('click', (event) => {
      if (event.target.getAttribute(this.triggers.remove) == undefined) {return}
      this.removeItem(event).then(data => this.updateCartTemplate(data.sections[this.selectors.id]));
    })
  }

  initializeQtyAdjustButtons(){
    document.addEventListener('click', (event) => {
      if (event.target.getAttribute(this.triggers.qtyAdjust) == undefined) {return}
      this.adjustItemQty(event).then(data => this.updateCartTemplate(data.sections[this.selectors.id]))
    })
  }

  initializeAtcButtons(){
    document.addEventListener('click', (event) => {
      if(event.target.closest(`[${this.triggers.atc}]`) == undefined){return}
      this.toggleLoading(true);
      this.addItem(event).then(data => {
        this.updateCartTemplate(data.sections[this.selectors.id]);
        this.toggleLoading(false);
      });
    });
  }

  //------------ END LISTENERS ---------------

  //------------ CUSTOM ----------------------

  rebuyScripts(){
    document.addEventListener('rebuy.add', (event) => {
      this.updateCartTemplate();
    });
  }

  rebuyInit(){
    if(window.Rebuy && window.Rebuy.init){
      window.Rebuy.init()
    }
  }

  //------------ END CUSTOM ------------------

  init(){
    this.initializeOpenDrawerButtons.bind(this)();
    this.initializeCloseDrawerButtons.bind(this)();
    this.initializeDrawerRemoveButtons.bind(this)();
    this.initializeQtyAdjustButtons.bind(this)();
    this.initializeAtcButtons.bind(this)();
    this.rebuyScripts.bind(this)();
  }
}

document.addEventListener("DOMContentLoaded", (event) => {
  let cartDrawer = new theme.CartDrawer();
  cartDrawer.init();
});
