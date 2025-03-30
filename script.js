// App State
const state = {
    coins: [],
    prices: {},
    portfolio: JSON.parse(localStorage.getItem('portfolio')) || {},
    balance: parseFloat(localStorage.getItem('balance')) || 10000,
    tradeHistory: JSON.parse(localStorage.getItem('tradeHistory')) || [],
    selectedCoin: null,
    demoUser: localStorage.getItem('demoUser') || generateRandomUsername()
};

// DOM Elements
const coinsGrid = document.getElementById('coinsGrid');
const portfolioValue = document.getElementById('portfolioValue');
const portfolioChange = document.getElementById('portfolioChange');
const portfolioAssets = document.getElementById('portfolioAssets');
const tradeForm = document.getElementById('tradeForm');
const tradeAmount = document.getElementById('tradeAmount');
const tradeType = document.getElementById('tradeType');
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');
const tradeError = document.getElementById('tradeError');
const tradeSuccess = document.getElementById('tradeSuccess');
const tradeHistory = document.getElementById('tradeHistory');
const selectedCoinDisplay = document.getElementById('selectedCoinDisplay');
const selectedCoinImage = document.getElementById('selectedCoinImage');
const selectedCoinName = document.getElementById('selectedCoinName');
const selectedCoinPrice = document.getElementById('selectedCoinPrice');
const balanceDisplay = document.getElementById('balanceDisplay');
const userDisplay = document.getElementById('userDisplay');
const userMenu = document.getElementById('userMenu');
const resetUserBtn = document.getElementById('resetUserBtn');

// Event Listeners
tradeForm.addEventListener('submit', handleTrade);
tradeType.addEventListener('change', updateTradeButtons);
userDisplay.addEventListener('click', toggleUserMenu);
resetUserBtn.addEventListener('click', resetUserData);
document.addEventListener('click', closeUserMenuOnOutsideClick);

// Initialize the app
init();

function init() {
    // Fetch market data
    fetchMarketData();

    // Load portfolio
    updatePortfolio();

    // Load trade history
    updateTradeHistory();

    // Initialize trade buttons
    updateTradeButtons();

    // Update balance display
    updateBalanceDisplay();

    // Update user display
    updateUserDisplay();
}

function generateRandomUsername() {
    const adjectives = ['Happy', 'Crypto', 'Digital', 'Moon', 'Bull', 'Bear', 'Diamond', 'Hodl'];
    const nouns = ['Trader', 'Investor', 'Whale', 'Shark', 'Noob', 'Pro', 'Holder', 'Fan'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000);
    return `${randomAdj}${randomNoun}${randomNum}`;
}

function updateUserDisplay() {
    userDisplay.textContent = state.demoUser;
}

function toggleUserMenu(e) {
    e.stopPropagation();
    userMenu.style.display = userMenu.style.display === 'block' ? 'none' : 'block';
}

function closeUserMenuOnOutsideClick(e) {
    if (!userMenu.contains(e.target) && e.target !== userDisplay) {
        userMenu.style.display = 'none';
    }
}

function resetUserData() {
    if (confirm('Are you sure you want to reset all data? This will clear your portfolio and trade history.')) {
        // Reset all data
        state.portfolio = {};
        state.balance = 10000;
        state.tradeHistory = [];
        state.demoUser = generateRandomUsername();
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Update UI
        updatePortfolio();
        updateTradeHistory();
        updateBalanceDisplay();
        updateUserDisplay();
        
        // Show success message
        tradeSuccess.textContent = 'Account has been reset to default settings.';
        setTimeout(() => {
            tradeSuccess.textContent = '';
        }, 3000);
    }
}

function updateBalanceDisplay() {
    balanceDisplay.textContent = `$${state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchMarketData() {
    try {
        coinsGrid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        // Using CoinGecko API
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false');
        const data = await response.json();

        state.coins = data.map(coin => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h,
            image: coin.image
        }));

        // Update prices object
        state.prices = {};
        data.forEach(coin => {
            state.prices[coin.id] = {
                price: coin.current_price,
                change: coin.price_change_percentage_24h
            };
        });

        renderCoins();
    } catch (error) {
        console.error('Error fetching market data:', error);
        coinsGrid.innerHTML = '<div class="error-message">Failed to load market data. Please try again later.</div>';
    }
}

function renderCoins() {
    coinsGrid.innerHTML = '';
    state.coins.forEach(coin => {
        const change = coin.change24h;
        const isRising = change >= 0;

        const coinElement = document.createElement('div');
        coinElement.className = `coin-card ${isRising ? 'rising' : 'falling'} ${state.selectedCoin?.id === coin.id ? 'selected' : ''}`;
        coinElement.innerHTML = `
            <div class="coin-header">
                <div class="coin-logo">
                    <img src="${coin.image}" alt="${coin.name}">
                </div>
                <div class="coin-name">${coin.name}</div>
            </div>
            <div class="coin-price">$${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
            <div class="coin-change ${isRising ? 'rising' : 'falling'}">
                ${isRising ? '+' : ''}${change.toFixed(2)}%
            </div>
        `;

        // Add click handler to select coin
        coinElement.addEventListener('click', () => {
            state.selectedCoin = coin;
            updateSelectedCoinDisplay();
            renderCoins(); // Re-render to update selection highlighting
        });

        coinsGrid.appendChild(coinElement);
    });
}

function updateSelectedCoinDisplay() {
    if (state.selectedCoin) {
        selectedCoinDisplay.style.display = 'block';
        selectedCoinImage.src = state.selectedCoin.image;
        selectedCoinImage.alt = state.selectedCoin.name;
        selectedCoinName.textContent = state.selectedCoin.name;
        selectedCoinPrice.textContent = `$${state.selectedCoin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
    } else {
        selectedCoinDisplay.style.display = 'none';
    }
}

function updatePortfolio() {
    // Calculate portfolio value
    let totalValue = state.balance;
    let totalChange = 0;
    let hasAssets = false;

    // Clear previous assets
    portfolioAssets.innerHTML = '';

    // Add each asset to portfolio
    for (const coinId in state.portfolio) {
        const amount = state.portfolio[coinId];
        if (amount > 0) {
            hasAssets = true;
            const coin = state.coins.find(c => c.id === coinId) || { 
                id: coinId, 
                symbol: coinId.toUpperCase(),
                price: state.prices[coinId]?.price || 0,
                change24h: state.prices[coinId]?.change || 0
            };

            const value = amount * (coin.price || 0);
            totalValue += value;
            totalChange += value * (coin.change24h || 0) / 100;

            const assetElement = document.createElement('div');
            assetElement.className = 'asset-item';
            assetElement.innerHTML = `
                <div class="asset-info">
                    <div class="coin-logo">
                        <img src="${coin.image || 'https://via.placeholder.com/24'}" alt="${coin.name || coin.symbol}">
                    </div>
                    <div>${coin.name || coin.symbol}</div>
                </div>
                <div>
                    <div class="asset-amount">${amount.toFixed(4)} ${coin.symbol.toUpperCase()}</div>
                    <div class="asset-value">$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            `;

            portfolioAssets.appendChild(assetElement);
        }
    }

    // If no assets, show message
    if (!hasAssets) {
        portfolioAssets.innerHTML = '<div style="text-align: center; opacity: 0.7;">No assets in your portfolio</div>';
    }

    // Update portfolio summary
    portfolioValue.textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const portfolioChangeValue = totalValue > state.balance ? 
        (totalChange / (totalValue - totalChange)) * 100 : 0;
    
    portfolioChange.className = `portfolio-change ${portfolioChangeValue >= 0 ? 'rising' : 'falling'}`;
    portfolioChange.innerHTML = `
        <span>${portfolioChangeValue >= 0 ? '+' : ''}${portfolioChangeValue.toFixed(2)}% (24h)</span>
    `;
}

function updateTradeHistory() {
    tradeHistory.innerHTML = '';

    if (state.tradeHistory.length === 0) {
        tradeHistory.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; opacity: 0.7;">No trades yet</td>
            </tr>
        `;
        return;
    }

    // Sort by date (newest first)
    const sortedHistory = [...state.tradeHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedHistory.forEach(trade => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(trade.date).toLocaleString()}</td>
            <td class="trade-type ${trade.type}">${trade.type.toUpperCase()}</td>
            <td>${trade.coin.toUpperCase()}</td>
            <td>${trade.amount.toFixed(4)}</td>
            <td>$${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
            <td>$${(trade.amount * trade.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        tradeHistory.appendChild(row);
    });
}

function updateTradeButtons() {
    const isBuy = tradeType.value === 'buy';
    buyBtn.style.display = isBuy ? 'block' : 'none';
    sellBtn.style.display = isBuy ? 'none' : 'block';
}

function handleTrade(e) {
    e.preventDefault();
    tradeError.textContent = '';
    tradeSuccess.textContent = '';

    if (!state.selectedCoin) {
        tradeError.textContent = 'Please select a coin first';
        return;
    }

    const coinId = state.selectedCoin.id;
    const amount = parseFloat(tradeAmount.value);
    const type = tradeType.value;

    // Validation
    if (isNaN(amount)) {
        tradeError.textContent = 'Please enter a valid amount';
        return;
    }

    if (amount <= 0) {
        tradeError.textContent = 'Amount must be greater than 0';
        return;
    }

    const coin = state.selectedCoin;
    const price = coin.price;
    const totalValue = amount * price;

    if (type === 'buy') {
        if (totalValue > state.balance) {
            tradeError.textContent = 'Insufficient funds';
            return;
        }

        // Execute buy
        state.balance -= totalValue;
        state.portfolio[coinId] = (state.portfolio[coinId] || 0) + amount;
        
        tradeSuccess.textContent = `Successfully bought ${amount.toFixed(4)} ${coin.symbol.toUpperCase()} for $${totalValue.toFixed(2)}`;
    } else {
        const currentAmount = state.portfolio[coinId] || 0;
        if (currentAmount < amount) {
            tradeError.textContent = `Insufficient coin balance (you have ${currentAmount.toFixed(4)} ${coin.symbol.toUpperCase()})`;
            return;
        }

        // Execute sell
        state.balance += totalValue;
        state.portfolio[coinId] -= amount;
        if (state.portfolio[coinId] <= 0) {
            delete state.portfolio[coinId];
        }
        
        tradeSuccess.textContent = `Successfully sold ${amount.toFixed(4)} ${coin.symbol.toUpperCase()} for $${totalValue.toFixed(2)}`;
    }

    // Record trade
    const trade = {
        date: new Date().toISOString(),
        type,
        coin: coin.symbol,
        amount,
        price,
        value: totalValue
    };

    state.tradeHistory.push(trade);

    // Save to localStorage
    saveToLocalStorage();

    // Update UI
    updatePortfolio();
    updateTradeHistory();
    updateBalanceDisplay();

    // Reset form
    tradeAmount.value = '';
}

function saveToLocalStorage() {
    localStorage.setItem('portfolio', JSON.stringify(state.portfolio));
    localStorage.setItem('balance', state.balance.toString());
    localStorage.setItem('tradeHistory', JSON.stringify(state.tradeHistory));
    localStorage.setItem('demoUser', state.demoUser);
}