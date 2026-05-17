const { createApp } = Vue;

createApp({
    template: `
    
    <div v-if="!isLoggedIn" class="fixed inset-0 z-[9999] login-backdrop flex items-center justify-center p-4">
        <div class="bg-white/80 backdrop-blur-xl w-full max-w-sm p-8 rounded-[2rem] shadow-2xl border border-white/50 animate-slide-up">
            <div class="text-center mb-8">
                <div class="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl shadow-lg shadow-blue-500/30 mb-4">
                    <i class="fa-solid fa-chart-simple"></i>
                </div>
                <h1 class="text-2xl font-black text-slate-800 tracking-tight">{{ authMode === 'login' ? '歡迎回來' : '初次設定' }}</h1>
                <p class="text-slate-500 font-bold text-sm mt-2">
                    {{ authMode === 'login' ? '請輸入密碼解鎖您的資產' : '請設定您的帳號密碼以保護資料' }}
                </p>
            </div>

            <div class="space-y-5">
                <div class="input-group">
                    <label class="text-xs font-bold text-slate-500 mb-2 ml-1">帳號</label>
                    <div class="relative flex items-center">
                        <input type="text" v-model="authInput.username" placeholder="User" class="w-full h-[54px] pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm">
                        <i class="fa-solid fa-user absolute left-4 text-slate-400 text-lg"></i>
                    </div>
                </div>

                <div class="input-group">
                    <label class="text-xs font-bold text-slate-500 mb-2 ml-1">密碼</label>
                    <div class="relative flex items-center">
                        <input type="password" v-model="authInput.password" placeholder="••••••" class="w-full h-[54px] pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm">
                        <i class="fa-solid fa-lock absolute left-4 text-slate-400 text-lg"></i>
                    </div>
                </div>

                <div v-if="authMode === 'setup'" class="input-group">
                    <label class="text-xs font-bold text-slate-500 mb-2 ml-1">確認密碼</label>
                    <div class="relative flex items-center">
                        <input type="password" v-model="authInput.confirmPassword" placeholder="••••••" class="w-full h-[54px] pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm">
                        <i class="fa-solid fa-check-double absolute left-4 text-slate-400 text-lg"></i>
                    </div>
                </div>
                
                <div class="flex items-center gap-3 ml-1 mt-1">
                    <input type="checkbox" id="remember-me" v-model="rememberUser" class="custom-checkbox cursor-pointer">
                    <label for="remember-me" class="text-sm font-bold text-slate-600 cursor-pointer select-none">記住帳號</label>
                </div>

                <button @click="handleAuthAction" class="w-full h-[54px] rounded-2xl font-bold text-white bg-blue-600 shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all text-lg mt-4 flex items-center justify-center gap-2 hover:bg-blue-700">
                    {{ authMode === 'login' ? '登入' : '設定並進入' }} <i class="fa-solid fa-arrow-right"></i>
                </button>
                
                <p v-if="authError" class="text-center text-red-500 text-sm font-bold bg-red-50 py-2 rounded-xl animate-pulse">{{ authError }}</p>

                <div v-if="authMode === 'login'" class="text-center mt-6">
                    <button @click="forgotPassword" class="text-xs text-slate-400 font-bold hover:text-slate-600 underline decoration-slate-300 underline-offset-4">忘記密碼 / 清除重置</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="isLoggedIn" class="app-shell max-w-7xl mx-auto p-4 md:p-8 pb-32" @click="closeContextMenu" @contextmenu.prevent>


        <div class="floating-price-update floating-position-target"
            :class="[{ 'is-loading': isLoading }, floatingControlClass('price')]"
            :style="floatingControlStyle('price')"
            @pointerdown="startFloatingControlDrag($event, 'price')">
            <span v-if="floatingEditMode" class="floating-position-handle"><i class="fa-solid fa-up-down-left-right"></i></span>
            <button @click.stop="floatingEditMode ? null : handleFloatingPriceClick()" :disabled="isLoading && !floatingEditMode" class="floating-price-update__btn" :title="floatingEditMode ? '拖曳調整更新股價按鈕位置' : (priceUpdateHintText || '更新股價')">
                <span class="floating-price-update__orb">
                    <i class="fa-solid fa-rotate" :class="{'fa-spin': isLoading}"></i>
                </span>
                <span class="floating-price-update__text">
                    <span class="floating-price-update__label">{{ isLoading ? '同步股價中' : '更新股價' }}</span>
                    <span class="floating-price-update__sub" :class="priceUpdateHintClass">
                        <i :class="priceUpdateHintIcon"></i>
                        <span>{{ isLoading ? '正在取得最新報價' : priceUpdateHintText }}</span>
                    </span>
                </span>
            </button>
        </div>

        <div v-if="isLoggedIn && floatingEditMode" class="floating-position-toolbar is-editing">
            <button type="button" class="floating-position-toolbar__btn floating-position-toolbar__btn--primary" @click.stop="toggleFloatingEditMode">
                <i class="fa-solid fa-lock"></i>
                <span>鎖定位置</span>
            </button>
            <button type="button" class="floating-position-toolbar__btn" @click.stop="resetFloatingControlPositions">
                <i class="fa-solid fa-rotate-left"></i>
                <span>重設</span>
            </button>
        </div>
        
        <div class="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-white/80 px-4 py-3 flex justify-between items-center md:hidden shadow-[0_10px_35px_-18px_rgba(15,23,42,0.28)] pt-[calc(env(safe-area-inset-top)+12px)]">

            <div class="w-full flex flex-col gap-2">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                            <i class="fa-solid fa-chart-simple text-lg"></i>
                        </div>
                        <div class="leading-tight">
                            <div class="text-lg font-black text-slate-800 tracking-tight">台股損益</div>
                            <div class="text-[11px] font-bold text-slate-500">快速切換帳本／設定</div>
                        </div>
                    </div>

                    <button @click="openPortfolioModal"
                            class="mobile-portfolio-btn max-w-[52vw] h-10 px-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-sm flex items-center gap-2 active:scale-95 transition shadow-sm">
                        <i class="fa-solid fa-book-open text-indigo-600"></i>
                        <span class="portfolio-name-truncate">{{ currentPortfolio.name }}</span>
                        <i class="fa-solid fa-chevron-down text-slate-400 text-xs ml-1"></i>
                    </button>
                </div>

                <div class="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button @click="showSecurityModal = true" class="mobile-tool-action mobile-tool-action--security" title="安全性設定"><i class="fa-solid fa-shield-halved"></i></button>
                    <button @click="showSettings = true" class="mobile-tool-action mobile-tool-action--fee" title="費率設定"><i class="fa-solid fa-percent"></i></button>
                    <button @click="exportData" class="mobile-tool-action mobile-tool-action--backup" title="備份（下載／還原）"><i class="fa-solid fa-file-arrow-down"></i></button>
                    <button @click="openCategoryDbModal" class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center active:bg-blue-100" title="族群資料庫"><i class="fa-solid fa-layer-group"></i></button>
                    <button @click="openCategoryManagerModal" class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center active:bg-emerald-100" title="族群管理"><i class="fa-solid fa-list-check"></i></button>
                    <button @click="showGDriveModal = true" class="mobile-tool-action mobile-tool-action--gdrive" title="Google 雲端備份"><i class="fa-solid fa-cloud-arrow-up"></i></button>
                    <button @click="openCommodityModal" class="mobile-tool-action mobile-tool-action--commodity" title="商品期貨"><i class="fa-solid fa-chart-line"></i></button>
                    <button @click="showHelpModal = true" class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center active:bg-blue-100 shadow-sm" title="說明"><i class="fa-solid fa-circle-question text-lg"></i></button>
                </div>
            </div>
        </div>

        <header class="desktop-header hidden md:flex flex-col mb-8 gap-4 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.28)] border border-white/90">
            <div class="desktop-header-top flex items-center justify-between gap-4">
                <div class="brand-block flex items-center gap-5 min-w-0">
                    <div class="bg-gradient-to-br from-blue-600 to-indigo-700 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                        <i class="fa-solid fa-chart-simple text-2xl"></i>
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-3xl font-extrabold text-slate-800 tracking-tight">台股損益管理</h1>
                        <p class="text-sm text-slate-500 font-bold tracking-wider mt-1">SMART TRACKER v4.4 Pro</p>
                    </div>
                </div>

                <button @click="openPortfolioModal" class="btn btn-secondary toolbar-action toolbar-action--portfolio portfolio-header-btn !h-12 !rounded-2xl px-4" title="投資帳本／自訂帳本" aria-label="投資帳本／自訂帳本">
                    <i class="fa-solid fa-book-open"></i>
                    <span class="portfolio-header-name ml-2 text-sm font-black text-indigo-700">{{ currentPortfolio.name }}</span>
                    <i class="fa-solid fa-chevron-down !w-auto !h-auto !rounded-none !bg-transparent !shadow-none !text-slate-400 text-xs ml-1"></i>
                </button>
            </div>

            <div class="desktop-header-bottom flex items-center justify-between gap-4">
                <div class="tab-switch" role="tablist" aria-label="主功能分頁">
                <button @click="currentTab = 'dashboard'; showStockDetails = false" type="button" role="tab" :aria-selected="currentTab === 'dashboard'" :class="['tab-btn tab-btn--dashboard', currentTab === 'dashboard' ? 'active' : '']">
                    <i class="fa-solid fa-gauge-high text-base"></i><span>總覽</span>
                </button>
                <button @click="currentTab = 'inventory'; showStockDetails = false" type="button" role="tab" :aria-selected="currentTab === 'inventory'" :class="['tab-btn tab-btn--inventory', currentTab === 'inventory' ? 'active' : '']">
                    <i class="fa-solid fa-briefcase text-base"></i><span>庫存管理</span>
                </button>
                <button @click="currentTab = 'history'; showStockDetails = false" type="button" role="tab" :aria-selected="currentTab === 'history'" :class="['tab-btn tab-btn--history', currentTab === 'history' ? 'active' : '']">
                    <i class="fa-solid fa-file-invoice-dollar text-base"></i><span>歷史帳務</span>
                </button>
                <button @click="currentTab = 'cash'; showStockDetails = false" type="button" role="tab" :aria-selected="currentTab === 'cash'" :class="['tab-btn tab-btn--cash', currentTab === 'cash' ? 'active' : '']">
                    <i class="fa-solid fa-money-bill-transfer text-base"></i><span>資金流</span>
                </button>
                </div>

                <div class="header-actions">
                    <button @click="showSecurityModal = true" class="btn btn-secondary toolbar-action toolbar-action--security !h-12 !w-12 !p-0 !rounded-2xl" title="安全性設定" aria-label="安全性設定"><i class="fa-solid fa-shield-halved"></i></button>
                <button @click="showSettings = true" class="btn btn-secondary toolbar-action toolbar-action--fee !h-12 !w-12 !p-0 !rounded-2xl" title="費率設定" aria-label="費率設定"><i class="fa-solid fa-percent"></i></button>
                <button @click="exportData" class="btn btn-secondary toolbar-action toolbar-action--backup !h-12 !w-12 !p-0 !rounded-2xl" title="備份" aria-label="備份"><i class="fa-solid fa-file-arrow-down"></i></button>
                <button @click="openCategoryDbModal" class="btn btn-secondary toolbar-action toolbar-action--categorydb !h-12 !w-12 !p-0 !rounded-2xl" title="族群資料庫" aria-label="族群資料庫"><i class="fa-solid fa-layer-group"></i></button>
                <button @click="openCategoryManagerModal" class="btn btn-secondary toolbar-action toolbar-action--categorymgr !h-12 !w-12 !p-0 !rounded-2xl" title="族群管理" aria-label="族群管理"><i class="fa-solid fa-list-check"></i></button>
                <button @click="showGDriveModal = true" class="btn btn-secondary toolbar-action toolbar-action--gdrive !h-12 !w-12 !p-0 !rounded-2xl" title="Google 雲端備份" aria-label="Google 雲端備份"><i class="fa-solid fa-cloud-arrow-up"></i></button>
                <button @click="openCommodityModal" class="btn btn-secondary toolbar-action toolbar-action--commodity !h-12 !w-12 !p-0 !rounded-2xl" title="商品期貨" aria-label="商品期貨"><i class="fa-solid fa-chart-line"></i></button>
                    <button @click="showHelpModal = true" class="btn btn-secondary toolbar-action toolbar-action--help !h-12 !w-12 !p-0 !rounded-2xl" title="使用說明" aria-label="使用說明"><i class="fa-solid fa-circle-question"></i></button>
                </div>
            </div>
        </header>

        <div class="h-36 md:hidden"></div>

        <div v-show="currentTab === 'dashboard'" class="space-y-6">
            <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-[2rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div class="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 blur-2xl"></div>
                <div class="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div>
                        <div class="dashboard-portfolio-pill inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-black text-slate-200 mb-4"><i class="fa-solid fa-gauge-high shrink-0"></i><span class="shrink-0">Dashboard 總覽｜</span><span class="portfolio-name-truncate">{{ currentPortfolio.name }}</span></div>
                        <div class="text-sm font-bold text-slate-300">總資產（現金 + 庫存市值）</div>
                        <div class="mt-2 text-4xl md:text-5xl font-black tracking-tight">{{ formatCurrency(netAssetValue) }}</div>
                        <div class="mt-3 text-sm font-black" :class="cashTotalPnL >= 0 ? 'text-red-200' : 'text-green-200'">總損益：{{ cashTotalPnL >= 0 ? '+' : '' }}{{ formatCurrency(cashTotalPnL) }}（{{ cashRoiPercent }}%）</div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 w-full lg:w-[420px]">
                        <div class="rounded-2xl bg-white/10 border border-white/10 p-4"><div class="text-xs font-bold text-slate-300">現金餘額</div><div class="mt-1 text-xl font-black" :class="cashBalance >= 0 ? 'text-emerald-200' : 'text-rose-200'">{{ cashBalance >= 0 ? '' : '-' }}{{ formatCurrency(Math.abs(cashBalance)) }}</div></div>
                        <div class="rounded-2xl bg-white/10 border border-white/10 p-4"><div class="text-xs font-bold text-slate-300">庫存市值</div><div class="mt-1 text-xl font-black text-white">{{ formatCurrency(estimatedMarketValue) }}</div></div>
                        <div class="rounded-2xl bg-white/10 border border-white/10 p-4"><div class="text-xs font-bold text-slate-300">已實現損益</div><div class="mt-1 text-xl font-black" :class="totalRealizedPnL >= 0 ? 'text-red-200' : 'text-green-200'">{{ totalRealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(totalRealizedPnL) }}</div></div>
                        <div class="rounded-2xl bg-white/10 border border-white/10 p-4"><div class="text-xs font-bold text-slate-300">未實現損益</div><div class="mt-1 text-xl font-black" :class="totalUnrealizedPnL >= 0 ? 'text-red-200' : 'text-green-200'">{{ totalUnrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(totalUnrealizedPnL) }}</div></div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="card !p-5"><div class="text-xs text-slate-400 font-bold mb-1">可用獲利</div><div class="text-2xl font-black" :class="availableRealizedProfit >= 0 ? 'text-red-600' : 'text-green-600'">{{ availableRealizedProfit >= 0 ? '+' : '' }}{{ formatCurrency(availableRealizedProfit) }}</div><div class="mt-2 text-xs font-bold text-slate-400">已實現 - 提領 + 補回</div></div>
                <div class="card !p-5"><div class="text-xs text-slate-400 font-bold mb-1">已提領獲利</div><div class="text-2xl font-black text-rose-600">-{{ formatCurrency(profitWithdrawalsTotal) }}</div><div class="mt-2 text-xs font-bold text-slate-400">已領出使用的獲利</div></div>
                <div class="card !p-5"><div class="text-xs text-slate-400 font-bold mb-1">已補回獲利</div><div class="text-2xl font-black text-emerald-700">+{{ formatCurrency(profitRestoresTotal) }}</div><div class="mt-2 text-xs font-bold text-slate-400">補回到獲利池</div></div>
            </div>



            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card">
                    <div class="flex items-center justify-between mb-4"><h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-layer-group text-blue-500"></i> 族群曝險排行</h3><span class="text-[11px] font-black text-slate-400">依主族群 / 市值</span></div>
                    <div v-if="themeExposureRows.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-bold">尚無持股族群資料</div>
                    <div v-else class="space-y-3">
                        <div v-for="row in themeExposureRows.slice(0, 6)" :key="row.theme" class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="flex items-center justify-between gap-3"><div><div class="font-black text-slate-700">{{ row.theme }}</div><div class="text-[11px] font-bold text-slate-400">{{ row.count }} 檔｜{{ row.stocks.join('、') }}</div></div><div class="text-right"><div class="font-black text-slate-800">{{ row.percent }}%</div><div class="text-[11px] font-bold text-slate-400">{{ formatCurrency(row.marketValue) }}</div></div></div>
                            <div class="mt-3 h-2.5 rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-blue-500" :style="{ width: row.barWidth + '%' }"></div></div>
                        </div>
                        <div v-if="themeRiskAlerts.length" class="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm font-bold text-amber-700 space-y-1"><div v-for="msg in themeRiskAlerts" :key="msg"><i class="fa-solid fa-triangle-exclamation mr-2"></i>{{ msg }}</div></div>
                    </div>
                </div>
                <div class="card">
                    <div class="flex items-center justify-between mb-4"><h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-ranking-star text-rose-500"></i> 族群損益排行</h3><span class="text-[11px] font-black text-slate-400">已實現 + 未實現</span></div>
                    <div v-if="themePnLRows.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-bold">尚無族群損益資料</div>
                    <div v-else class="space-y-3">
                        <div v-for="row in themePnLRows.slice(0, 6)" :key="row.theme" class="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between gap-3">
                            <div><div class="font-black text-slate-700">{{ row.theme }}</div><div class="text-[11px] font-bold text-slate-400">未實現 {{ row.unrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(row.unrealizedPnL) }}</div></div>
                            <div class="text-right"><div class="font-black text-xl" :class="row.totalPnL >= 0 ? 'text-red-600' : 'text-green-600'">{{ row.totalPnL >= 0 ? '+' : '' }}{{ formatCurrency(row.totalPnL) }}</div><div class="text-[11px] font-bold text-slate-400">市值占 {{ row.percent }}%</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card">
                    <div class="flex items-center justify-between mb-4"><h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-chart-pie text-indigo-500"></i> 資產組成</h3><button @click="currentTab='cash'" class="text-xs font-black text-indigo-600 hover:underline">查看資金流</button></div>
                    <div class="space-y-3">
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between"><div><div class="text-sm font-black text-slate-700">現金餘額</div><div class="text-xs font-bold text-slate-400">可用現金水位</div></div><div class="font-black text-slate-800">{{ formatCurrency(cashBalance) }}</div></div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between"><div><div class="text-sm font-black text-slate-700">庫存市值</div><div class="text-xs font-bold text-slate-400">依最新股價估算</div></div><div class="font-black text-slate-800">{{ formatCurrency(estimatedMarketValue) }}</div></div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between"><div><div class="text-sm font-black text-slate-700">淨投入</div><div class="text-xs font-bold text-slate-400">期初 + 入金 - 出金</div></div><div class="font-black text-slate-800">{{ formatCurrency(cashNetContribution) }}</div></div>
                    </div>
                </div>
                <div class="card">
                    <div class="flex items-center justify-between mb-4"><h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-tags text-amber-500"></i> 獲利用途分類</h3><button @click="currentTab='cash'" class="text-xs font-black text-amber-600 hover:underline">新增提領/補回</button></div>
                    <div v-if="profitWithdrawalCategorySummary.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-bold">尚無獲利提領分類資料</div>
                    <div v-else class="space-y-3">
                        <div v-for="item in profitWithdrawalCategorySummary" :key="item.category" class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="flex items-center justify-between gap-3"><div class="font-black text-slate-700">{{ item.label }}</div><div class="font-black text-rose-600">{{ formatCurrency(item.amount) }}</div></div>
                            <div class="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-amber-400" :style="{ width: item.percent + '%' }"></div></div>
                            <div class="mt-1 text-[11px] font-bold text-slate-400 text-right">{{ item.percent }}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-show="currentTab === 'inventory'">
            <div v-if="!showStockDetails">
                <div v-show="inventoryStickySummaryDocked" class="fixed top-[8.75rem] md:top-4 left-3 right-3 md:left-1/2 md:right-auto md:w-[min(80rem,calc(100vw-4rem))] md:-translate-x-1/2 z-[35] rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] px-3 py-2 md:px-5 md:py-3 transition-all duration-200">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] md:text-sm font-black text-slate-600">
                        <div class="inline-flex items-center gap-1.5 whitespace-nowrap"><i class="fa-solid fa-coins text-blue-500"></i><span class="text-slate-500">持股市值</span><span class="text-slate-900">{{ formatCurrency(estimatedMarketValue) }}</span></div>
                        <span class="text-slate-300">｜</span>
                        <div class="inline-flex items-center gap-1.5 whitespace-nowrap"><span class="text-slate-500">未實現</span><span :class="totalUnrealizedPnL >= 0 ? 'text-up' : 'text-down'">{{ totalUnrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(totalUnrealizedPnL) }}</span></div>
                        <span class="text-slate-300">｜</span>
                        <div class="inline-flex items-center gap-1.5 whitespace-nowrap"><span class="text-slate-500">持股</span><span class="text-slate-900">{{ holdings.length }} 檔</span></div>
                        <span class="text-slate-300">｜</span>
                        <div class="inline-flex items-center gap-1.5 whitespace-nowrap"><i :class="priceUpdateHintIcon" class="text-[10px]"></i><span class="text-slate-500">更新</span><span :class="priceUpdateHintClass">{{ inventoryStickyUpdateLabel }}</span></div>
                    </div>
                </div>
                <div v-if="inventoryStickySummaryDocked" aria-hidden="true" class="h-[3.25rem] md:h-[3.5rem] mb-4"></div>
            <div class="block md:hidden space-y-4 mb-6">
                <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10"><i class="fa-solid fa-wallet text-9xl"></i></div>
                    <div class="relative z-10 space-y-5">
                        <div class="flex items-start justify-between gap-4">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 text-slate-300 text-xs font-bold tracking-wide"><span class="inline-flex items-center gap-2">未實現損益</span></div>
                                <div class="mt-1 text-4xl font-black tracking-tight" :class="totalUnrealizedPnL >= 0 ? 'text-red-400' : 'text-green-400'">
                                    {{ totalUnrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(totalUnrealizedPnL) }}
                                </div>
                                <div class="mt-2 text-sm font-black tracking-tight" :class="totalRealizedPnL >= 0 ? 'text-red-200' : 'text-green-200'">
                                    已實現損益：{{ totalRealizedPnL > 0 ? '+' : '' }}{{ formatCurrency(totalRealizedPnL) }}
                                </div>
                                <div class="mt-1 text-[11px] text-slate-300/80 font-semibold">以最新更新股價估算</div>
                            </div>
                            <div class="shrink-0">
                                <div class="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-black" :class="totalUnrealizedPnL >= 0 ? 'text-red-200' : 'text-green-200'">
                                    <i class="fa-solid fa-chart-line mr-1 opacity-80"></i>
                                    {{ totalInvestedCost > 0 ? ((totalUnrealizedPnL / totalInvestedCost) * 100).toFixed(2) : 0 }}%
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="rounded-2xl bg-white/5 border border-white/10 p-4">
                                <div class="flex items-center justify-between"><div class="text-slate-300 text-xs font-bold">持倉總市值</div><i class="fa-solid fa-coins text-white/60"></i></div>
                                <div class="mt-1 text-lg font-black tracking-tight">{{ formatCurrency(estimatedMarketValue) }}</div>
                            </div>
                            <div class="rounded-2xl bg-white/5 border border-white/10 p-4">
                                <div class="flex items-center justify-between"><div class="text-slate-300 text-xs font-bold">總投入成本</div><i class="fa-solid fa-circle-dollar-to-slot text-white/60"></i></div>
                                <div class="mt-1 text-lg font-black tracking-tight text-slate-100">{{ formatCurrency(totalInvestedCost) }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-3">
                    <button @click="showInventoryMarketPanel = !showInventoryMarketPanel" class="group relative overflow-hidden w-full rounded-[1.35rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-sky-100/70 px-4 py-4 text-left shadow-[0_12px_32px_-24px_rgba(37,99,235,0.55)] active:scale-[0.99] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_38px_-24px_rgba(37,99,235,0.7)]">
                        <div class="absolute -right-6 -top-7 w-24 h-24 rounded-full bg-blue-400/10 group-hover:bg-blue-400/20 transition-colors"></div>
                        <div class="relative flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center text-lg">
                                <i class="fa-solid fa-binoculars"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2"><div class="text-base font-black text-slate-800 truncate">市場觀察</div><span v-if="showInventoryMarketPanel" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">已展開</span></div>
                                <div class="text-xs font-bold text-slate-500 mt-0.5 truncate">法人未平倉 · 個股籌碼 · 注意處置</div>
                            </div>
                            <div class="w-9 h-9 rounded-full bg-white/80 border border-white shadow-sm flex items-center justify-center text-blue-500">
                                <i class="fa-solid transition-transform" :class="showInventoryMarketPanel ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
                            </div>
                        </div>
                    </button>
                    <button @click="showGlobalIndices = true; fetchGlobalIndices()" class="group relative overflow-hidden w-full rounded-[1.35rem] border border-violet-100 bg-gradient-to-br from-white via-violet-50/60 to-fuchsia-100/60 px-4 py-4 text-left shadow-[0_12px_32px_-24px_rgba(124,58,237,0.55)] active:scale-[0.99] transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_18px_38px_-24px_rgba(124,58,237,0.7)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        <div class="absolute -right-6 -top-7 w-24 h-24 rounded-full bg-violet-400/10 group-hover:bg-violet-400/20 transition-colors"></div>
                        <div class="relative flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 flex items-center justify-center text-lg">
                                <i class="fa-solid fa-earth-americas" :class="{'fa-spin': isGlobalLoading}"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="text-base font-black text-slate-800 truncate">全球指數（夜）</div>
                                <div class="text-xs font-bold text-slate-500 mt-0.5 truncate">美股 · 台股夜盤參考</div>
                            </div>
                            <div class="w-9 h-9 rounded-full bg-white/80 border border-white shadow-sm flex items-center justify-center text-violet-500">
                                <i class="fa-solid" :class="isGlobalLoading ? 'fa-spinner fa-spin' : 'fa-chevron-right'"></i>
                            </div>
                        </div>
                    </button>
                    <button @click="openYahooIndex" title="台指期夜盤・美股" class="group relative overflow-hidden w-full rounded-[1.35rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-4 py-4 text-left shadow-[0_12px_32px_-24px_rgba(15,23,42,0.35)] active:scale-[0.99] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_38px_-24px_rgba(15,23,42,0.45)]">
                        <div class="absolute -right-6 -top-7 w-24 h-24 rounded-full bg-slate-400/10 group-hover:bg-slate-400/20 transition-colors"></div>
                        <div class="relative flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-900 text-white shadow-lg shadow-slate-500/20 flex items-center justify-center text-lg">
                                <i class="fa-solid fa-chart-line"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="text-base font-black text-slate-800 truncate">Yahoo 指數</div>
                                <div class="text-xs font-bold text-slate-500 mt-0.5 truncate">新視窗開啟台指期夜盤 · 美股</div>
                            </div>
                            <div class="w-9 h-9 rounded-full bg-white/80 border border-white shadow-sm flex items-center justify-center text-slate-500">
                                <i class="fa-solid fa-arrow-up-right-from-square text-sm"></i>
                            </div>
                        </div>
                    </button>
                </div>
                <div class="text-center text-xs font-bold">
                    <div class="flex items-center justify-center gap-1" :class="priceUpdateHintClass"><i :class="priceUpdateHintIcon"></i><span>{{ priceUpdateHintText }}</span></div>
                    <div class="text-slate-400 mt-0.5">更新時間: {{ lastUpdateTime || '--' }}</div>
                </div>
            </div>

            <div class="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="card !mb-0 !border-0 shadow-xl relative overflow-hidden group bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white">
                    <div class="absolute -right-6 -top-6 text-white/5 group-hover:text-white/10 transition-colors duration-500"><i class="fa-solid fa-wallet text-[150px]"></i></div>
                    <div class="relative z-10 flex flex-col justify-between h-full">
                        <div><div class="flex items-center gap-2 mb-1"><div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-300"><i class="fa-solid fa-sack-dollar"></i></div><h3 class="font-bold text-slate-300 text-sm tracking-wide">持倉總市值</h3></div><p class="text-4xl font-black tracking-tight mt-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">{{ formatCurrency(estimatedMarketValue) }}</p></div>
                        <div class="mt-6 pt-4 border-t border-white/10"><div class="flex justify-between items-center text-sm"><span class="text-slate-400 font-bold">總投入成本</span><span class="font-mono font-bold text-slate-200">{{ formatCurrency(totalInvestedCost) }}</span></div><div class="w-full h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden"><div class="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" :style="{ width: totalInvestedCost > 0 ? Math.min((totalInvestedCost / estimatedMarketValue) * 100, 100) + '%' : '0%' }"></div></div></div>
                    </div>
                </div>
                <div class="card !mb-0 !border-0 shadow-xl relative overflow-hidden flex flex-col justify-between" :class="totalUnrealizedPnL >= 0 ? 'bg-gradient-to-br from-red-50 to-white border-2 border-red-100' : 'bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100'">
                    <div class="absolute right-0 top-1/2 -translate-y-1/2 text-[120px] opacity-5 pointer-events-none" :class="totalUnrealizedPnL >= 0 ? 'text-red-600' : 'text-emerald-600'"><i class="fa-solid" :class="totalUnrealizedPnL >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'"></i></div>
                    <div><div class="flex items-center gap-2 mb-1"><div class="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" :class="totalUnrealizedPnL >= 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'"><i class="fa-solid" :class="totalUnrealizedPnL >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i></div><h3 class="font-bold text-sm tracking-wide" :class="totalUnrealizedPnL >= 0 ? 'text-red-800' : 'text-emerald-800'">未實現損益 (帳面)</h3></div><div class="mt-3 flex items-baseline gap-2"><p class="text-4xl font-black tracking-tight" :class="totalUnrealizedPnL >= 0 ? 'text-red-600 drop-shadow-sm' : 'text-emerald-600 drop-shadow-sm'">{{ totalUnrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(totalUnrealizedPnL) }}</p></div></div>
                    <div class="mt-4 flex items-center justify-between bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-sm"><span class="text-xs font-bold text-slate-500 uppercase">Return on Investment</span><span class="text-lg font-black px-3 py-0.5 rounded-lg" :class="totalUnrealizedPnL >= 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'">{{ totalInvestedCost > 0 ? ((totalUnrealizedPnL / totalInvestedCost) * 100).toFixed(2) : 0 }}%</span></div>
                </div>
                <div class="card !mb-0 flex flex-col justify-center items-center gap-3">
                    <div class="grid grid-cols-1 gap-3 w-full">
                        <button @click="showInventoryMarketPanel = !showInventoryMarketPanel" class="group relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-sky-100/70 px-5 py-4 text-left shadow-[0_16px_40px_-28px_rgba(37,99,235,0.65)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_22px_46px_-28px_rgba(37,99,235,0.85)] active:scale-[0.99]">
                            <div class="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-blue-400/10 group-hover:bg-blue-400/20 transition-colors"></div>
                            <div class="relative flex items-center gap-3 min-w-0">
                                <div class="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center text-lg"><i class="fa-solid fa-binoculars"></i></div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 min-w-0"><div class="font-black text-slate-800 truncate">市場觀察</div><span v-if="showInventoryMarketPanel" class="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">已展開</span></div>
                                    <div class="text-xs font-bold text-slate-500 mt-0.5 truncate">法人未平倉 · 個股籌碼 · 注意處置</div>
                                </div>
                                <div class="shrink-0 w-9 h-9 rounded-full bg-white/80 border border-white shadow-sm flex items-center justify-center text-blue-500"><i class="fa-solid transition-transform" :class="showInventoryMarketPanel ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                            </div>
                        </button>
                        <button @click="showGlobalIndices = true; fetchGlobalIndices()" class="group relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-r from-white via-violet-50/70 to-fuchsia-100/60 px-5 py-4 text-left shadow-[0_16px_40px_-28px_rgba(124,58,237,0.65)] transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_46px_-28px_rgba(124,58,237,0.85)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                            <div class="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-violet-400/10 group-hover:bg-violet-400/20 transition-colors"></div>
                            <div class="relative flex items-center gap-3 min-w-0">
                                <div class="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 flex items-center justify-center text-lg"><i class="fa-solid fa-earth-americas" :class="{'fa-spin': isGlobalLoading}"></i></div>
                                <div class="min-w-0 flex-1">
                                    <div class="font-black text-slate-800 truncate">全球指數（夜）</div>
                                    <div class="text-xs font-bold text-slate-500 mt-0.5 truncate">美股 · 台股夜盤參考</div>
                                </div>
                                <div class="shrink-0 w-9 h-9 rounded-full bg-white/80 border border-white shadow-sm flex items-center justify-center text-violet-500"><i class="fa-solid" :class="isGlobalLoading ? 'fa-spinner fa-spin' : 'fa-chevron-right'"></i></div>
                            </div>
                        </button>
                        <button @click="openYahooIndex" title="台指期夜盤・美股" class="group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-slate-100 px-5 py-4 text-left shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_46px_-28px_rgba(15,23,42,0.55)] active:scale-[0.99]">
                            <div class="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-slate-400/10 group-hover:bg-slate-400/20 transition-colors"></div>
                            <div class="relative flex items-center gap-3 min-w-0">
                                <div class="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-900 text-white shadow-lg shadow-slate-500/20 flex items-center justify-center text-lg"><i class="fa-solid fa-chart-line"></i></div>
                                <div class="min-w-0 flex-1">
                                    <div class="font-black text-slate-800 truncate">Yahoo 指數</div>
                                    <div class="text-xs font-bold text-slate-500 mt-0.5 truncate">新視窗開啟台指期夜盤 · 美股</div>
                                </div>
                                <div class="shrink-0 w-9 h-9 rounded-full bg-white/80 border border-white shadow-sm flex items-center justify-center text-slate-500"><i class="fa-solid fa-arrow-up-right-from-square text-sm"></i></div>
                            </div>
                        </button>
                    </div>
                    <div class="text-xs font-bold w-full text-center"><div class="flex items-center justify-center gap-1" :class="priceUpdateHintClass"><i :class="priceUpdateHintIcon"></i><span>{{ priceUpdateHintText }}</span></div><div class="text-slate-400 mt-0.5">{{ lastUpdateTime ? '上次更新: ' + lastUpdateTime : '' }}</div></div>
                </div>
            </div>

            <div v-if="showGlobalIndices" class="fixed inset-0 z-[84] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" @click.self="showGlobalIndices = false">
                <div class="relative w-full max-w-6xl max-h-[88vh] md:max-h-[86vh] overflow-y-auto modal-scroll rounded-[2rem] bg-white border border-slate-200 shadow-[0_28px_90px_-35px_rgba(15,23,42,0.75)] p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-modal-pop">
                    <button @click="showGlobalIndices = false" aria-label="關閉全球指數" title="關閉" class="absolute right-4 top-4 z-10 w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-sm flex items-center justify-center">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                    <div class="pr-14 md:pr-16 mb-6">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 flex items-center justify-center text-lg">
                                <i class="fa-solid fa-earth-americas"></i>
                            </div>
                            <div class="min-w-0">
                                <h2 class="text-xl md:text-2xl font-black text-slate-800 truncate">全球指數（夜）</h2>
                                <div class="text-xs md:text-sm font-bold text-slate-500 mt-1 truncate">美股 · 台股夜盤參考</div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between gap-3 mb-5 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <div class="min-w-0 text-xs font-bold">
                            <div class="flex items-center gap-1" :class="globalUpdateHintClass"><i :class="globalUpdateHintIcon"></i><span>{{ globalUpdateHintText }}</span></div>
                            <div class="text-slate-400 mt-0.5" v-if="globalIndicesLastTs">更新時間: {{ new Date(globalIndicesLastTs).toLocaleString('zh-TW', { hour12: false }) }}</div>
                        </div>
                        <button @click="fetchGlobalIndices" :disabled="isGlobalLoading" class="shrink-0 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-black shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                            <i class="fa-solid fa-rotate-right" :class="{'text-purple-500': !isGlobalLoading, 'fa-spin': isGlobalLoading}"></i>更新
                        </button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                        <div v-for="idx in globalIndices" :key="idx.symbol" class="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden transition-transform hover:-translate-y-1">
                            <div v-if="idx.kind === 'taiexNight'" class="flex items-start justify-between gap-2 mb-2 text-left">
                                <div class="text-sm text-slate-500 font-bold leading-snug flex-1">{{ idx.name }}</div>
                                <button @click="fetchTaiexNightIndex" :disabled="isTaiexNightLoading" class="shrink-0 w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"><i class="fa-solid fa-rotate-right" :class="{'fa-spin': isTaiexNightLoading}"></i></button>
                            </div>
                            <div v-else class="text-sm text-slate-500 font-bold mb-2">{{ idx.name }}</div>
                            <div class="text-2xl font-black text-slate-800 tracking-tight">{{ idx.price }}</div>
                            <div class="text-base font-bold mt-2" :class="idx.change >= 0 ? 'text-red-500' : 'text-green-500'">{{ idx.change >= 0 ? '▲' : '▼' }} {{ Math.abs(idx.change).toFixed(2) }} <span class="text-sm ml-1">({{ Math.abs(idx.percent).toFixed(2) }}%)</span></div>
                            <div class="absolute bottom-0 left-0 w-full h-1.5" :class="idx.change >= 0 ? 'bg-red-500' : 'bg-green-500'"></div>
                        </div>
                    </div>
                    <button @click="showGlobalIndices = false" class="mt-6 w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-chevron-down"></i>
                        關閉全球指數（夜）
                    </div>
                </div>
            </div>

            <button @click="showAddModal = true" class="md:hidden fixed bottom-24 right-5 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 z-50 flex items-center justify-center text-3xl active:scale-90 transition-transform"><i class="fa-solid fa-plus"></i></button>

            <!-- Mobile Add Transaction Modal -->
            <div v-if="showAddModal" @click.self="showAddModal = false" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[95] md:hidden flex items-end justify-center">
                <div class="bg-white w-full rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border-t border-slate-200 pb-[calc(env(safe-area-inset-bottom)+16px)] animate-slide-up">
                    <div class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                        <div class="font-black text-slate-800 text-base flex items-center gap-2">
                            <i class="fa-solid fa-pen-to-square text-blue-600"></i>
                            新增交易
                        </div>
                        <button @click="showAddModal = false" class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200 transition-colors" title="關閉">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="p-4 overflow-y-auto">
<div class="card relative z-10 !pb-10 border-t-4" :class="newTx.type === 'buy' ? 'border-t-blue-500' : 'border-t-rose-500'">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-extrabold text-slate-800 flex items-center">
                        <span class="w-10 h-10 rounded-xl flex items-center justify-center mr-3 text-lg" :class="newTx.type === 'buy' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'">
                            <i class="fa-solid" :class="newTx.type === 'buy' ? 'fa-cart-shopping' : 'fa-arrow-right-from-bracket'"></i>
                        </span>
                        新增交易紀錄
                    </h2>
                    <div class="flex flex-col items-end gap-2">
                    <label class="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" v-model="newTx.dayTradeEligible" class="w-4 h-4 accent-amber-500">
                        參與當沖配對（配對成功的賣出部分稅率 {{ settings.dayTradeTaxRate }}%）
                    </label>
                    <button @click="openPortfolioModal" class="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 active:scale-95 transition">
                        目前帳本：<span class="text-slate-700">{{ currentPortfolio.name }}</span> <i class="fa-solid fa-pen-to-square ml-1 text-slate-400"></i>
                    </button>
</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易日期</label>
                        <div class="relative flex items-center">
                            <input type="date" v-model="newTx.date" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm cursor-pointer">
                            <i class="fa-regular fa-calendar-days absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易方向</label>
                        <div class="relative flex items-center">
                            <select v-model="newTx.type" class="w-full h-[50px] pl-11 pr-10 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm appearance-none cursor-pointer">
                                <option value="buy">🟥 買入 / 回補</option>
                                <option value="sell">🟩 賣出 / 融券(做空)</option>
                            </select>
                            <i class="fa-solid fa-right-left absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                            <i class="fa-solid fa-chevron-down absolute right-4 text-slate-300 text-xs pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易身分</label>
                        <div class="relative flex items-center">
                            <select v-model="newTx.mode" class="w-full h-[50px] pl-11 pr-10 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm appearance-none cursor-pointer">
                                <option value="cash">💵 現股</option>
                                <option value="margin">🏦 融資</option>
                                <option value="short">📉 融券</option>
                            </select>
                            <i class="fa-solid fa-layer-group absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                            <i class="fa-solid fa-chevron-down absolute right-4 text-slate-300 text-xs pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group relative">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1 flex justify-between">股票代碼 / 名稱 <span v-if="isSearching" class="text-blue-600 text-xs animate-pulse">搜尋中...</span></label>
                        <div class="relative flex items-center">
                            <input type="text" v-model="searchText" @input="lookupStock" placeholder="如: 2330" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-slate-300 placeholder:font-normal">
                            <i class="fa-solid fa-magnifying-glass absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                        </div>
                        <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-list !top-[55px]">
                            <div v-for="s in suggestions" :key="s.code" @click="selectSuggestion(s)" class="suggestion-item group">
                                <div>
                                    <span class="font-black text-blue-600 mr-2 w-14 inline-block">{{ s.code }}</span>
                                    <span class="text-slate-700 font-bold">{{ s.name }}</span>
                                    <span v-if="s.isOnline" class="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">線上</span>
                                </div>
                                <i class="fa-solid fa-plus text-slate-300 group-hover:text-blue-500"></i>
                            </div>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">策略分類</label>
                        <div class="relative flex items-center">
                            <select v-model="newTx.category" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm appearance-none cursor-pointer">
                                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label || cat.name }}</option>
                            </select>
                            <i class="fa-solid fa-tag absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                            <i class="fa-solid fa-chevron-down absolute right-4 text-slate-300 text-xs pointer-events-none"></i>
                        </div>
                            <div class="flex gap-2 mt-2">
                                <input v-model="newCategoryName" type="text" placeholder="新增分類名稱…" class="flex-1 h-11 px-4 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 min-w-0" />
                                <button @click="addCategory" type="button" class="h-11 px-4 rounded-xl font-black bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition whitespace-nowrap">新增</button>
                            </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">成交價格</label>
                        <div class="relative flex items-center">
                            <input type="number" step="0.01" v-model.number="newTx.price" placeholder="0.00" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-slate-300">
                            <i class="fa-solid fa-dollar-sign absolute left-4 text-slate-400 text-base pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">成交股數</label>
                        <div class="relative flex items-center">
                            <input type="number" v-model.number="newTx.qty" placeholder="1000" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-slate-300">
                            <i class="fa-solid fa-cubes absolute left-4 text-slate-400 text-base pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group justify-end">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1 opacity-0 select-none">Action</label>
                        <button @click="addTransaction" class="w-full h-[50px] rounded-xl font-bold text-white shadow-lg active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-2" :class="newTx.type === 'buy' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'">
                            <i class="fa-solid fa-check"></i>
                            {{ newTx.type === 'buy' ? '確認新增買入 / 回補' : '確認新增賣出 / 做空' }}
                        </button>
                        <div v-if="newTx.type === 'sell'" class="mt-2 text-[11px] text-slate-400 font-bold leading-relaxed">提示：若賣出股數大於可用庫存，請改選「融券」或勾選「當沖」並在同日新增回補（先賣後買）。</div>
                        <button type="button" @click="showAddModal = false"
                            class="mt-3 w-full h-[46px] rounded-xl font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition">
                            取消 / 關閉
                        </button>
                    </div>
                </div>
            </div>
                    </div>
                </div>
            </div>

            <div class="hidden md:block card relative z-10 !pb-10 border-t-4" :class="newTx.type === 'buy' ? 'border-t-blue-500' : 'border-t-rose-500'">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-extrabold text-slate-800 flex items-center">
                        <span class="w-10 h-10 rounded-xl flex items-center justify-center mr-3 text-lg" :class="newTx.type === 'buy' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'">
                            <i class="fa-solid" :class="newTx.type === 'buy' ? 'fa-cart-shopping' : 'fa-arrow-right-from-bracket'"></i>
                        </span>
                        新增交易紀錄
                    </h2>
                    <label class="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" v-model="newTx.dayTradeEligible" class="w-4 h-4 accent-amber-500">
                        參與當沖配對（配對成功的賣出部分稅率 {{ settings.dayTradeTaxRate }}%）
                    </label>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易日期</label>
                        <div class="relative flex items-center">
                            <input type="date" v-model="newTx.date" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm cursor-pointer">
                            <i class="fa-regular fa-calendar-days absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易方向</label>
                        <div class="relative flex items-center">
                            <select v-model="newTx.type" class="w-full h-[50px] pl-11 pr-10 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm appearance-none cursor-pointer">
                                <option value="buy">🟥 買入 / 回補</option>
                                <option value="sell">🟩 賣出 / 融券(做空)</option>
                            </select>
                            <i class="fa-solid fa-right-left absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                            <i class="fa-solid fa-chevron-down absolute right-4 text-slate-300 text-xs pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易身分</label>
                        <div class="relative flex items-center">
                            <select v-model="newTx.mode" class="w-full h-[50px] pl-11 pr-10 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm appearance-none cursor-pointer">
                                <option value="cash">💵 現股</option>
                                <option value="margin">🏦 融資</option>
                                <option value="short">📉 融券</option>
                            </select>
                            <i class="fa-solid fa-layer-group absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                            <i class="fa-solid fa-chevron-down absolute right-4 text-slate-300 text-xs pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group relative">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1 flex justify-between">股票代碼 / 名稱 <span v-if="isSearching" class="text-blue-600 text-xs animate-pulse">搜尋中...</span></label>
                        <div class="relative flex items-center">
                            <input type="text" v-model="searchText" @input="lookupStock" placeholder="如: 2330" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-slate-300 placeholder:font-normal">
                            <i class="fa-solid fa-magnifying-glass absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                        </div>
                        <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-list !top-[55px]">
                            <div v-for="s in suggestions" :key="s.code" @click="selectSuggestion(s)" class="suggestion-item group">
                                <div>
                                    <span class="font-black text-blue-600 mr-2 w-14 inline-block">{{ s.code }}</span>
                                    <span class="text-slate-700 font-bold">{{ s.name }}</span>
                                    <span v-if="s.isOnline" class="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">線上</span>
                                </div>
                                <i class="fa-solid fa-plus text-slate-300 group-hover:text-blue-500"></i>
                            </div>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">策略分類</label>
                        <div class="relative flex items-center">
                            <select v-model="newTx.category" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm appearance-none cursor-pointer">
                                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label || cat.name }}</option>
                            </select>
                            <i class="fa-solid fa-tag absolute left-4 text-slate-400 text-lg pointer-events-none"></i>
                            <i class="fa-solid fa-chevron-down absolute right-4 text-slate-300 text-xs pointer-events-none"></i>
                        </div>
                            <div class="flex gap-2 mt-2">
                                <input v-model="newCategoryName" type="text" placeholder="新增分類名稱…" class="flex-1 h-11 px-4 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 min-w-0" />
                                <button @click="addCategory" type="button" class="h-11 px-4 rounded-xl font-black bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition whitespace-nowrap">新增</button>
                            </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">成交價格</label>
                        <div class="relative flex items-center">
                            <input type="number" step="0.01" v-model.number="newTx.price" placeholder="0.00" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-slate-300">
                            <i class="fa-solid fa-dollar-sign absolute left-4 text-slate-400 text-base pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">成交股數</label>
                        <div class="relative flex items-center">
                            <input type="number" v-model.number="newTx.qty" placeholder="1000" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-slate-300">
                            <i class="fa-solid fa-cubes absolute left-4 text-slate-400 text-base pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="input-group justify-end">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1 opacity-0 select-none">Action</label>
                        <button @click="addTransaction" class="w-full h-[50px] rounded-xl font-bold text-white shadow-lg active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-2" :class="newTx.type === 'buy' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'">
                            <i class="fa-solid fa-check"></i>
                            {{ newTx.type === 'buy' ? '確認新增買入 / 回補' : '確認新增賣出 / 做空' }}
                        </button>
                        <div v-if="newTx.type === 'sell'" class="mt-2 text-[11px] text-slate-400 font-bold leading-relaxed">提示：若賣出股數大於可用庫存，請改選「融券」或勾選「當沖」並在同日新增回補（先賣後買）。</div>
                    </div>
                </div>
            </div>

            <div v-if="showInventoryMarketPanel" class="fixed inset-0 z-[85] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" @click.self="showInventoryMarketPanel = false">
                <div class="relative w-full max-w-7xl max-h-[88vh] md:max-h-[86vh] overflow-y-auto modal-scroll rounded-[2rem] bg-white border border-slate-200 shadow-[0_28px_90px_-35px_rgba(15,23,42,0.75)] p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-modal-pop">
                    <button @click="showInventoryMarketPanel = false" aria-label="關閉市場觀察" title="關閉" class="absolute right-4 top-4 z-10 w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-sm flex items-center justify-center">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pr-12 md:pr-14">
                    <div>
                        <div class="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                            <i class="fa-solid fa-chart-simple text-blue-500"></i> 市場觀察
                        </div>
                        <div class="text-xs md:text-sm font-bold text-slate-500 mt-1">需要時再展開查詢台指期貨法人未平倉、個股籌碼與注意／處置狀態，不會佔用持股列表空間。</div>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full lg:w-auto">
                        <button @click="fetchTaiexFuturesInstitutionalOi" :disabled="institutionalOiLoading" class="h-12 px-3 md:px-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                            <i class="fa-solid" :class="institutionalOiLoading ? 'fa-spinner fa-spin' : 'fa-building-columns'"></i>
                            <span class="hidden sm:inline">台指法人未平倉</span><span class="sm:hidden">台指法人</span>
                        </button>
                        <button @click="queryAllHoldingChipData" :disabled="chipBatchLoading || chipLoading || stockRiskLoading || !holdings.length" class="h-12 px-3 md:px-4 rounded-2xl font-black text-white bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
                            <i class="fa-solid" :class="chipBatchLoading ? 'fa-spinner fa-spin' : 'fa-layer-group'"></i>
                            <span class="hidden sm:inline">一鍵查持股</span><span class="sm:hidden">查持股</span>
                        </button>
                        <button @click="queryStockChipData" :disabled="chipBatchLoading || chipLoading || stockRiskLoading" class="h-12 px-3 md:px-4 rounded-2xl font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                            <i class="fa-solid" :class="(chipLoading || stockRiskLoading) ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-chart'"></i>
                            <span class="hidden sm:inline">查個股籌碼</span><span class="sm:hidden">個股籌碼</span>
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-5">
                <div class="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 md:p-5 shadow-sm">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <div>
                            <div class="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                <i class="fa-solid fa-building-columns text-indigo-600"></i> 台指期貨法人未平倉
                            </div>
                            <div class="text-xs font-bold text-slate-500 mt-1">免費資料來源：期交所 Open Data「三大法人－區分各期貨契約－依日期」，篩選商品：臺股期貨。</div>
                        </div>
                        <button @click="fetchTaiexFuturesInstitutionalOi" :disabled="institutionalOiLoading" class="h-11 px-4 rounded-xl font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <i class="fa-solid" :class="institutionalOiLoading ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
                            {{ institutionalOiLoading ? '查詢中…' : '更新台指期貨法人未平倉' }}
                        </button>
                    </div>

                    <div v-if="institutionalOiError" class="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                        <i class="fa-solid fa-triangle-exclamation mr-2"></i>{{ institutionalOiError }}
                    </div>

                    <div v-if="institutionalOiRows.length" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="rounded-2xl bg-white border border-indigo-100 p-4">
                                <div class="text-xs font-bold text-slate-400">資料日期</div>
                                <div class="mt-1 text-xl font-black text-slate-800">{{ institutionalOiData.dateLabel || '-' }}</div>
                                <div class="mt-1 text-[11px] font-bold text-slate-400">查詢時間：{{ institutionalOiLastUpdate || '-' }}</div>
                            </div>
                            <div class="rounded-2xl bg-white border border-indigo-100 p-4">
                                <div class="text-xs font-bold text-slate-400">外資及陸資未平倉淨額</div>
                                <div class="mt-1 text-2xl font-black" :class="institutionalForeignOiNet >= 0 ? 'text-up' : 'text-down'">{{ institutionalForeignOiNet >= 0 ? '+' : '' }}{{ formatCurrency(institutionalForeignOiNet) }} 口</div>
                                <div class="mt-1 text-[11px] font-bold text-slate-400">多方 - 空方</div>
                            </div>
                            <div class="rounded-2xl bg-white border border-indigo-100 p-4">
                                <div class="text-xs font-bold text-slate-400">三大法人合計淨額</div>
                                <div class="mt-1 text-2xl font-black" :class="institutionalTotalOiNet >= 0 ? 'text-up' : 'text-down'">{{ institutionalTotalOiNet >= 0 ? '+' : '' }}{{ formatCurrency(institutionalTotalOiNet) }} 口</div>
                                <div class="mt-1 text-[11px] font-bold text-slate-400">自營商 + 投信 + 外資</div>
                            </div>
                        </div>

                        <div v-if="institutionalOiAnalysis" class="rounded-2xl border p-4 shadow-sm" :class="institutionalOiAnalysis.className">
                            <div class="flex flex-col md:flex-row md:items-start gap-3">
                                <div class="w-11 h-11 rounded-2xl bg-white/80 border border-current/10 flex items-center justify-center shrink-0">
                                    <i class="fa-solid text-lg" :class="institutionalOiAnalysis.icon"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="text-xs font-black px-2.5 py-1 rounded-full bg-white/80 border border-current/10">{{ institutionalOiAnalysis.signal }}</span>
                                        <span class="text-xs font-black px-2.5 py-1 rounded-full bg-white/70 border border-current/10">多空判讀</span>
                                        <span class="text-base md:text-lg font-black">{{ institutionalOiAnalysis.title }}</span>
                                    </div>
                                    <p class="mt-2 text-sm font-bold leading-relaxed opacity-90">{{ institutionalOiAnalysis.summary }}</p>
                                    <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div v-for="(item, idx) in institutionalOiAnalysis.points" :key="idx" class="rounded-xl bg-white/70 border border-current/10 px-3 py-2 text-xs md:text-sm font-bold leading-relaxed">
                                            <i class="fa-solid fa-circle-check mr-1 opacity-70"></i>{{ item }}
                                        </div>
                                    </div>
                                    <div class="mt-2 text-[11px] font-bold opacity-60">判讀僅依未平倉多空淨額做盤後參考，不代表明日一定方向。</div>
                                </div>
                            </div>
                        </div>

                        <div class="overflow-x-auto bg-white rounded-2xl border border-indigo-100">
                            <table class="w-full text-sm min-w-[760px]">
                                <thead class="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th class="px-4 py-3 text-left font-black">身份別</th>
                                        <th class="px-4 py-3 text-right font-black">多方未平倉</th>
                                        <th class="px-4 py-3 text-right font-black">空方未平倉</th>
                                        <th class="px-4 py-3 text-right font-black">多空淨額</th>
                                        <th class="px-4 py-3 text-right font-black">淨額契約金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in institutionalOiRows" :key="row.identity" class="border-t border-slate-100 hover:bg-indigo-50/50">
                                        <td class="px-4 py-3 font-extrabold text-slate-700">{{ row.identity }}</td>
                                        <td class="px-4 py-3 text-right font-bold text-slate-700">{{ formatCurrency(row.oiLong) }}</td>
                                        <td class="px-4 py-3 text-right font-bold text-slate-700">{{ formatCurrency(row.oiShort) }}</td>
                                        <td class="px-4 py-3 text-right font-black" :class="row.oiNet >= 0 ? 'text-up' : 'text-down'">{{ row.oiNet >= 0 ? '+' : '' }}{{ formatCurrency(row.oiNet) }}</td>
                                        <td class="px-4 py-3 text-right font-bold text-slate-600">{{ formatSignedAmountK(row.oiNetAmountK) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div v-else class="rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-6 text-center text-slate-500 font-bold">
                        尚未查詢。按「查詢最新資料」即可從期交所免費 Open Data 取得最新臺股期貨法人未平倉資料。
                    </div>
                </div>

                <div class="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 md:p-5 shadow-sm">
                    <div class="flex flex-col gap-3 mb-4">
                        <div class="min-w-0">
                            <div class="text-base font-extrabold text-slate-800 flex items-center gap-2 leading-snug">
                                <i class="fa-solid fa-chart-line text-emerald-600 shrink-0"></i>
                                <span class="min-w-0 break-words">個股籌碼 / 注意處置查詢</span>
                            </div>
                            <div class="text-xs font-bold text-slate-500 mt-1 leading-relaxed break-words">免費資料來源：TWSE / TPEx 公開資料。提供三大法人、融資融券快照，並檢查是否列入注意股、累計異常或處置股。</div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 w-full">
                            <input v-model.trim="chipQueryCode" @keyup.enter="queryStockChipData" inputmode="numeric" placeholder="輸入股票代號，例如 2330" class="h-11 px-4 rounded-xl bg-white border border-emerald-200 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 w-full min-w-0">
                            <select v-model.number="chipQueryDays" class="h-11 px-3 rounded-xl bg-white border border-emerald-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 w-full min-w-0">
                                <option :value="10">近 10 筆</option>
                                <option :value="20">近 20 筆</option>
                                <option :value="60">近 60 筆</option>
                            </select>
                            <button @click="queryStockChipData" :disabled="chipBatchLoading || chipLoading || stockRiskLoading" class="h-11 px-4 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full min-w-0">
                                <i class="fa-solid shrink-0" :class="(chipLoading || stockRiskLoading) ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-chart'"></i>
                                <span class="truncate">{{ (chipLoading || stockRiskLoading) ? '查詢中…' : '查詢個股籌碼 / 注意' }}</span>
                            </button>
                            <button @click="queryAllHoldingChipData" :disabled="chipBatchLoading || chipLoading || stockRiskLoading || !holdings.length" class="h-11 px-4 rounded-xl font-extrabold text-white bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full min-w-0">
                                <i class="fa-solid shrink-0" :class="chipBatchLoading ? 'fa-spinner fa-spin' : 'fa-layer-group'"></i>
                                <span class="truncate">{{ chipBatchLoading ? ('查持股 ' + chipBatchDone + '/' + chipBatchTotal) : '一鍵查持股' }}</span>
                            </button>
                        </div>
                        <div v-if="chipBatchLoading || chipBatchMessage" class="rounded-2xl border px-4 py-3 text-sm font-bold w-full" :class="chipBatchLoading ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-slate-50 text-slate-600'">
                            <i class="fa-solid mr-2" :class="chipBatchLoading ? 'fa-spinner fa-spin' : 'fa-circle-check'"></i>{{ chipBatchMessage || ('正在查詢目前持股：' + chipBatchDone + '/' + chipBatchTotal) }}
                        </div>
                    </div>

                    <div v-if="chipError" class="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                        <i class="fa-solid fa-triangle-exclamation mr-2"></i>{{ chipError }}
                    </div>
                    <div v-if="stockRiskError" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                        <i class="fa-solid fa-circle-info mr-2"></i>{{ stockRiskError }}
                    </div>

                    <div v-if="chipRows.length || stockRiskData.fetchedAt" class="space-y-4">
                        <div class="rounded-2xl bg-white border p-4" :class="stockRiskSummary.className || 'text-slate-600 bg-slate-50 border-slate-200'">
                            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                <div>
                                    <div class="text-xs font-black opacity-70">注意 / 處置狀態</div>
                                    <div class="mt-1 flex flex-wrap items-center gap-2">
                                        <span class="text-2xl font-black">{{ stockRiskSummary.label || '未查詢' }}</span>
                                        <span class="px-2 py-1 rounded-lg bg-white/70 border border-current/10 text-xs font-black">注意 {{ stockRiskSummary.attentionCount || 0 }}</span>
                                        <span class="px-2 py-1 rounded-lg bg-white/70 border border-current/10 text-xs font-black">累計異常 {{ stockRiskSummary.warningCount || 0 }}</span>
                                        <span class="px-2 py-1 rounded-lg bg-white/70 border border-current/10 text-xs font-black">處置 {{ stockRiskSummary.dispositionCount || 0 }}</span>
                                    </div>
                                    <div class="mt-1 text-[11px] font-bold opacity-70">查詢區間：近 {{ stockRiskData.lookbackDays || stockRiskLookbackDays }} 天 · 更新：{{ stockRiskLastUpdate || stockRiskData.fetchedAtLabel || '-' }}</div>
                                </div>
                                <button @click="queryStockRiskData(chipQueryCode)" :disabled="stockRiskLoading" class="h-10 px-4 rounded-xl font-black bg-white/80 border border-current/20 hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
                                    <i class="fa-solid" :class="stockRiskLoading ? 'fa-spinner fa-spin' : 'fa-shield-halved'"></i>
                                    只查注意 / 處置
                                </button>
                            </div>
                            <div v-if="stockRiskRecords.length" class="mt-3 overflow-x-auto rounded-xl bg-white/80 border border-current/10">
                                <table class="w-full text-sm min-w-[760px]">
                                    <thead class="bg-white/70 opacity-80">
                                        <tr>
                                            <th class="px-4 py-3 text-left font-black">類型</th>
                                            <th class="px-4 py-3 text-left font-black">來源</th>
                                            <th class="px-4 py-3 text-left font-black">日期 / 期間</th>
                                            <th class="px-4 py-3 text-left font-black">條件 / 原因 / 措施</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(row, idx) in stockRiskRecords" :key="idx" class="border-t border-current/10">
                                            <td class="px-4 py-3 font-black">{{ row.type === 'disposition' ? '處置' : (row.type === 'warning' ? '累計異常' : '注意') }}</td>
                                            <td class="px-4 py-3 font-bold">{{ row.source }}</td>
                                            <td class="px-4 py-3 font-bold">{{ row.dateLabel || row.startDateLabel || '-' }}<span v-if="row.endDateLabel"> ～ {{ row.endDateLabel }}</span></td>
                                            <td class="px-4 py-3 font-bold leading-relaxed">{{ row.measure || row.reason || row.rawText || '-' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div v-else class="mt-3 rounded-xl bg-white/65 border border-current/10 px-4 py-3 text-sm font-bold">
                                目前查詢區間內沒有找到注意、累計異常或處置紀錄。官方盤後資料仍可能延遲更新。
                            </div>
                        </div>

                        <div v-if="chipRows.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div class="rounded-2xl bg-white border border-emerald-100 p-4">
                                <div class="text-xs font-bold text-slate-400">股票 / 市場</div>
                                <div class="mt-1 text-xl font-black text-slate-800">{{ chipData.code }} {{ chipData.name || '' }}</div>
                                <div class="mt-1 text-[11px] font-bold text-slate-400">{{ chipData.market || '-' }} · 更新：{{ chipLastUpdate || chipData.fetchedAtLabel || '-' }}</div>
                            </div>
                            <div class="rounded-2xl bg-white border border-emerald-100 p-4">
                                <div class="text-xs font-bold text-slate-400">最新三大法人合計</div>
                                <div class="mt-1 text-2xl font-black" :class="chipSummary.latest?.totalNetLots >= 0 ? 'text-up' : 'text-down'">{{ chipSummary.latest?.totalNetLots >= 0 ? '+' : '' }}{{ formatCurrency(chipSummary.latest?.totalNetLots || 0) }} 張</div>
                                <div class="mt-1 text-[11px] font-bold text-slate-400">資料日：{{ chipSummary.latest?.dateLabel || '-' }}</div>
                            </div>
                            <div class="rounded-2xl bg-white border border-emerald-100 p-4">
                                <div class="text-xs font-bold text-slate-400">近 5 / 20 筆合計</div>
                                <div class="mt-1 text-lg font-black" :class="chipSummary.total5 >= 0 ? 'text-up' : 'text-down'">5 筆：{{ chipSummary.total5 >= 0 ? '+' : '' }}{{ formatCurrency(chipSummary.total5 || 0) }} 張</div>
                                <div class="mt-1 text-sm font-extrabold" :class="chipSummary.total20 >= 0 ? 'text-up' : 'text-down'">20 筆：{{ chipSummary.total20 >= 0 ? '+' : '' }}{{ formatCurrency(chipSummary.total20 || 0) }} 張</div>
                            </div>
                            <div class="rounded-2xl bg-white border border-emerald-100 p-4">
                                <div class="text-xs font-bold text-slate-400">籌碼摘要</div>
                                <div class="mt-1 text-2xl font-black" :class="chipSummary.signal === '偏多' ? 'text-up' : (chipSummary.signal === '偏空' ? 'text-down' : 'text-slate-700')">{{ chipSummary.signal || '中性' }}</div>
                                <div class="mt-1 text-[11px] font-bold text-slate-400">連續{{ chipSummary.streak >= 0 ? '買超' : '賣超' }} {{ Math.abs(chipSummary.streak || 0) }} 筆</div>
                            </div>
                        </div>

                        <div v-if="chipOverviewCard" class="rounded-3xl bg-white border border-emerald-100 shadow-sm overflow-hidden">
                            <div class="px-4 md:px-5 py-4 bg-gradient-to-r from-slate-50 to-emerald-50 border-b border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20"><i class="fa-solid fa-table-list"></i></div>
                                        <div>
                                            <div class="font-black text-slate-800 text-lg">籌碼總覽</div>
                                            <div class="text-xs font-bold text-slate-400">成交量、法人、融資融券、當沖與周轉率</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-xs font-black px-3 py-1.5 rounded-full bg-white border border-emerald-100 text-emerald-700 w-fit">
                                    {{ chipOverviewCard.dateLabel || chipSummary.latest?.dateLabel || '-' }}
                                </div>
                            </div>
                            <div class="p-4 md:p-5 grid grid-cols-1 gap-4">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div v-for="item in chipOverviewCard.items" :key="item.key" class="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                        <div class="font-black text-slate-600">{{ item.label }}</div>
                                        <div class="text-right">
                                            <div class="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-black shadow-sm" :class="item.className">{{ item.value }}</div>
                                            <div v-if="item.sub" class="mt-1 text-[10px] font-bold text-slate-400">{{ item.sub }}</div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="chipOverviewAnalysis" class="rounded-2xl border p-4" :class="chipOverviewAnalysis.className">
                                    <div class="flex items-start gap-3">
                                        <div class="w-10 h-10 rounded-2xl bg-white/80 border border-current/10 flex items-center justify-center shrink-0">
                                            <i class="fa-solid" :class="chipOverviewAnalysis.icon"></i>
                                        </div>
                                        <div class="flex-1">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="text-xs font-black px-2.5 py-1 rounded-full bg-white/80 border border-current/10">{{ chipOverviewAnalysis.signal }}</span>
                                                <div class="font-black text-base">{{ chipOverviewAnalysis.title }}</div>
                                            </div>
                                            <p class="mt-2 text-sm font-bold leading-relaxed opacity-90">{{ chipOverviewAnalysis.summary }}</p>
                                            <div class="mt-3 space-y-2">
                                                <div v-for="(point, idx) in chipOverviewAnalysis.points" :key="idx" class="rounded-xl bg-white/70 border border-current/10 px-3 py-2 text-xs md:text-sm font-bold leading-relaxed">
                                                    <i class="fa-solid fa-lightbulb mr-1 opacity-70"></i>{{ point }}
                                                </div>
                                            </div>
                                            <div class="mt-2 text-[11px] font-bold opacity-60">當沖與周轉率若官方資料尚未提供，會以「-」顯示，不影響法人與融資融券判讀。</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="chipAutoAnalysis" class="rounded-2xl border p-4 shadow-sm" :class="chipAutoAnalysis.className">
                            <div class="flex flex-col md:flex-row md:items-start gap-3">
                                <div class="w-11 h-11 rounded-2xl bg-white/80 border border-current/10 flex items-center justify-center shrink-0">
                                    <i class="fa-solid text-lg" :class="chipAutoAnalysis.icon"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="text-xs font-black px-2.5 py-1 rounded-full bg-white/80 border border-current/10">{{ chipAutoAnalysis.signal }}</span>
                                        <span class="text-xs font-black px-2.5 py-1 rounded-full bg-white/70 border border-current/10">自動解讀</span>
                                        <span class="text-base md:text-lg font-black">{{ chipAutoAnalysis.title }}</span>
                                    </div>
                                    <p class="mt-2 text-sm font-bold leading-relaxed opacity-90">{{ chipAutoAnalysis.summary }}</p>
                                    <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div v-for="(item, idx) in chipAutoAnalysis.points" :key="idx" class="rounded-xl bg-white/70 border border-current/10 px-3 py-2 text-xs md:text-sm font-bold leading-relaxed">
                                            <i class="fa-solid fa-lightbulb mr-1 opacity-70"></i>{{ item }}
                                        </div>
                                    </div>
                                    <div class="mt-2 text-[11px] font-bold opacity-60">自動解讀以公開盤後資料計算，適合輔助觀察，不作為單獨買賣依據。</div>
                                </div>
                            </div>
                        </div>

                        <div v-if="chipRows.length" class="grid grid-cols-1 gap-3">
                            <div class="overflow-x-auto bg-white rounded-2xl border border-emerald-100">
                                <table class="w-full text-sm min-w-[840px]">
                                    <thead class="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th class="px-4 py-3 text-left font-black">日期</th>
                                            <th class="px-4 py-3 text-right font-black">外資</th>
                                            <th class="px-4 py-3 text-right font-black">投信</th>
                                            <th class="px-4 py-3 text-right font-black">自營商</th>
                                            <th class="px-4 py-3 text-right font-black">三大法人合計</th>
                                            <th class="px-4 py-3 text-right font-black">占成交量</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="row in chipRows" :key="row.date" class="border-t border-slate-100 hover:bg-emerald-50/50">
                                            <td class="px-4 py-3 font-extrabold text-slate-700">{{ row.dateLabel }}</td>
                                            <td class="px-4 py-3 text-right font-bold" :class="row.foreignNetLots >= 0 ? 'text-up' : 'text-down'">{{ row.foreignNetLots >= 0 ? '+' : '' }}{{ formatCurrency(row.foreignNetLots) }}</td>
                                            <td class="px-4 py-3 text-right font-bold" :class="row.trustNetLots >= 0 ? 'text-up' : 'text-down'">{{ row.trustNetLots >= 0 ? '+' : '' }}{{ formatCurrency(row.trustNetLots) }}</td>
                                            <td class="px-4 py-3 text-right font-bold" :class="row.dealerNetLots >= 0 ? 'text-up' : 'text-down'">{{ row.dealerNetLots >= 0 ? '+' : '' }}{{ formatCurrency(row.dealerNetLots) }}</td>
                                            <td class="px-4 py-3 text-right font-black" :class="row.totalNetLots >= 0 ? 'text-up' : 'text-down'">{{ row.totalNetLots >= 0 ? '+' : '' }}{{ formatCurrency(row.totalNetLots) }}</td>
                                            <td class="px-4 py-3 text-right font-bold text-slate-600">{{ formatPercentValue(row.institutionalVolumeRatio) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="rounded-2xl bg-white border border-emerald-100 p-4 space-y-3">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="font-extrabold text-slate-700">融資融券快照</div>
                                    <span v-if="chipMarginAnalysis" class="text-[11px] font-black px-2.5 py-1 rounded-full" :class="chipMarginAnalysis.badgeClass">{{ chipMarginAnalysis.signal }}</span>
                                </div>
                                <div v-if="chipMarginRows.length" class="space-y-2 text-sm">
                                    <div class="flex justify-between gap-3"><span class="font-bold text-slate-500">資料日</span><span class="font-black text-slate-800">{{ chipMarginRows[0].dateLabel }}</span></div>
                                    <div class="flex justify-between gap-3"><span class="font-bold text-slate-500">融資餘額</span><span class="font-black text-slate-800">{{ formatCurrency(chipMarginRows[0].financeBalance) }}</span></div>
                                    <div class="flex justify-between gap-3"><span class="font-bold text-slate-500">融券餘額</span><span class="font-black text-slate-800">{{ formatCurrency(chipMarginRows[0].shortBalance) }}</span></div>
                                    <div v-if="chipMarginAnalysis" class="grid grid-cols-2 gap-2 pt-2">
                                        <div class="rounded-xl bg-slate-50 border border-slate-100 p-2">
                                            <div class="text-[11px] font-bold text-slate-400">融資變化</div>
                                            <div class="mt-1 font-black" :class="chipMarginAnalysis.financeDiff > 0 ? 'text-down' : (chipMarginAnalysis.financeDiff < 0 ? 'text-up' : 'text-slate-700')">{{ chipMarginAnalysis.financeDiff >= 0 ? '+' : '' }}{{ formatCurrency(chipMarginAnalysis.financeDiff) }}</div>
                                        </div>
                                        <div class="rounded-xl bg-slate-50 border border-slate-100 p-2">
                                            <div class="text-[11px] font-bold text-slate-400">融券變化</div>
                                            <div class="mt-1 font-black" :class="chipMarginAnalysis.shortDiff > 0 ? 'text-amber-600' : (chipMarginAnalysis.shortDiff < 0 ? 'text-up' : 'text-slate-700')">{{ chipMarginAnalysis.shortDiff >= 0 ? '+' : '' }}{{ formatCurrency(chipMarginAnalysis.shortDiff) }}</div>
                                        </div>
                                    </div>
                                    <div v-if="chipMarginAnalysis" class="rounded-2xl border p-3 mt-2" :class="chipMarginAnalysis.className">
                                        <div class="flex items-start gap-2">
                                            <div class="w-8 h-8 rounded-xl bg-white/80 border border-current/10 flex items-center justify-center shrink-0">
                                                <i class="fa-solid" :class="chipMarginAnalysis.icon"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-black text-sm">{{ chipMarginAnalysis.title }}</div>
                                                <div class="mt-1 text-xs font-bold leading-relaxed opacity-90">{{ chipMarginAnalysis.summary }}</div>
                                                <div class="mt-2 space-y-1">
                                                    <div v-for="(item, idx) in chipMarginAnalysis.points" :key="idx" class="text-[11px] font-bold leading-relaxed bg-white/60 border border-current/10 rounded-lg px-2 py-1">
                                                        <i class="fa-solid fa-circle-info mr-1 opacity-60"></i>{{ item }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-100">目前只有單日融資融券快照，尚無法和前一交易日比較；可再查詢近 10 / 20 / 60 筆取得更多資料。</div>
                                    <div class="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-100">融資常代表散戶槓桿籌碼；融券代表放空籌碼。判讀以餘額變化輔助觀察，不作為單獨買賣依據。</div>
                                </div>
                                <div v-else class="text-sm font-bold text-slate-500 leading-relaxed">目前沒有抓到融資融券資料；三大法人買賣超仍可正常作為籌碼摘要。</div>
                            </div>
                        </div>
                    </div>

                    <div v-else class="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-center text-slate-500 font-bold">
                        輸入股票代號後可查詢近 10 / 20 / 60 筆三大法人買賣超，並檢查近 60 天注意 / 處置相關公告。這是盤後資料，不是即時交易建議。
                    </div>
                </div>
                    <div class="-mx-4 md:-mx-6 mt-6 px-4 md:px-6 pt-4 pb-1 border-t border-slate-100">
                        <button @click="showInventoryMarketPanel = false" class="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-xmark"></i>
                            關閉市場觀察
                        </button>
                    </div>
                </div>
            </div>
            </div>

            <div v-if="currentTab === 'inventory' && !showStockDetails" class="space-y-4"><div class="flex flex-col md:flex-row justify-between items-center px-2 gap-4"><div class="flex items-center gap-3"><h2 class="text-xl font-bold text-slate-700 flex items-center"><i class="fa-solid fa-layer-group text-slate-400 mr-3"></i> 目前持倉</h2><div class="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex"><button type="button" @click="setHoldingsViewMode('compact')" class="px-3 py-2 rounded-lg text-xs font-black transition" :class="holdingsViewMode === 'compact' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'"><i class="fa-solid fa-bars-staggered mr-1"></i>簡潔</button><button type="button" @click="setHoldingsViewMode('detailed')" class="px-3 py-2 rounded-lg text-xs font-black transition" :class="holdingsViewMode === 'detailed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'"><i class="fa-solid fa-table-cells-large mr-1"></i>詳細</button></div></div><div class="flex flex-wrap w-full md:w-auto gap-2 mt-0 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200"><button @click="filter = 'all'" :class="filter==='all' ? 'active' : ''" class="filter-btn flex-1 md:flex-none !py-3 !text-base md:!px-6 md:!text-lg md:min-w-[92px]">全部</button><button v-for="cat in filterCategories" :key="cat.id" @click="filter = cat.id" :class="filter===cat.id ? 'active' : ''" class="filter-btn flex-1 md:flex-none !py-3 !text-base md:!px-6 md:!text-lg md:min-w-[92px]">{{ cat.shortLabel || cat.name }}</button></div></div><div v-if="holdings.length === 0" class="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-300 text-slate-400"><i class="fa-solid fa-box-open text-6xl mb-4 opacity-30"></i><p class="font-bold text-lg">尚無庫存資料</p></div><div v-else class="grid grid-cols-1 gap-5"><div v-for="(stock, idx) in filteredHoldings" :key="stock.code" draggable="true" @dragstart="onHoldingCardDragStart(stock.code)" @dragover.prevent="onHoldingCardDragOver(stock.code)" @dragleave="onHoldingCardDragLeave(stock.code)" @drop.prevent="onHoldingCardDrop(stock.code, 'holdings')" @dragend="onHoldingCardDragEnd" @contextmenu.prevent="openContextMenu($event, stock)" class="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border-2 border-transparent hover:border-blue-200 transition-all duration-300 group cursor-default relative" :class="[{ 'holding-card-compact': holdingsViewMode === 'compact' }, dragOverHoldingCode === stock.code ? 'ring-4 ring-cyan-300 ring-offset-2' : '', draggingHoldingCode === stock.code ? 'opacity-50 scale-[0.99]' : '']"><div class="absolute top-2 right-4 text-[10px] text-slate-300 hidden md:block group-hover:text-slate-400"><i class="fa-solid fa-grip-vertical mr-1 cursor-grab active:cursor-grabbing"></i>拖曳排序　<i class="fa-solid fa-mouse-pointer mr-1"></i>右鍵設定狀態</div><div class="flex flex-col lg:flex-row gap-6 items-center"><div class="flex items-center gap-5 w-full lg:w-1/4"><div class="w-1.5 h-16 rounded-full" :class="categoryBarClass(stock.category)"></div><div class="bg-slate-50 px-2 py-3 rounded-xl text-center min-w-[110px] border border-slate-200 flex flex-col justify-center"><div class="text-xl font-black text-slate-800 leading-tight"><button type="button" @click="openStockDetails(stock)" class="text-left hover:underline underline-offset-4" :class="stock.isWarning ? 'text-warning' : ''">{{ displayNameOnly(stock.code, stock.name) }}</button></div><div class="text-xs font-bold text-slate-500 mt-1 flex items-center justify-center gap-1"><span>{{ stock.code }}</span><span v-if="stock.isWarning" title="注意/警示股" class="animate-pulse"><i class="fa-solid fa-triangle-exclamation text-red-500"></i></span></div></div><div><span class="text-[10px] px-2 py-1 rounded font-bold" :class="categoryBadgeClass(stock.category)">{{ categoryShort(stock.category) }}</span><div class="text-slate-500 text-sm mt-1 font-medium">持有 <strong class="text-slate-800 text-xl mx-1">{{ formatCurrency(stock.qty) }}</strong> 股</div><div class="mt-2 flex flex-wrap gap-1.5 max-w-[220px]"><span class="text-[10px] px-2 py-1 rounded-full border font-black" :class="categorySourceClass(getStockCategory(stock.code).source)">{{ getStockCategory(stock.code).mainTheme }}</span><span v-for="tag in categoryThemeTags(stock.code).filter(t => t !== getStockCategory(stock.code).mainTheme).slice(0, 3)" :key="stock.code + '-theme-' + tag" class="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{{ tag }}</span><button type="button" @click.stop="openCategoryModal(stock)" class="text-[10px] px-2 py-1 rounded-full bg-white border border-blue-200 text-blue-600 font-black hover:bg-blue-50" title="編輯個股族群"><i class="fa-solid fa-pen-to-square mr-1"></i>族群</button></div></div></div><div class="holding-metrics flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 w-full bg-slate-50/50 p-4 rounded-xl border border-slate-200"><div class="text-center md:text-left"><div class="text-xs text-slate-400 mb-1 font-bold uppercase">現價</div><div class="font-bold text-blue-600 text-xl">{{ stock.currentPrice || '-' }}</div></div><div class="compact-hide text-center md:text-left"><div class="text-xs text-slate-400 mb-1 font-bold uppercase">購買均價</div><div class="font-bold text-slate-700 text-xl">{{ stock.buyAvgPrice ? stock.buyAvgPrice.toFixed(2) : '-' }}</div></div><div class="text-center md:text-left"><div class="text-xs text-slate-400 mb-1 font-bold uppercase">未實現損益</div><div class="font-black text-xl" :class="stock.unrealizedPnL >= 0 ? 'text-up' : 'text-down'">{{ stock.unrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(stock.unrealizedPnL) }}</div></div><div class="compact-hide text-center md:text-left"><div class="text-xs text-slate-400 mb-1 font-bold uppercase">已實現損益</div><div class="font-black text-xl" :class="stock.realizedPnL >= 0 ? 'text-up' : 'text-down'">{{ stock.realizedPnL > 0 ? '+' : '' }}{{ formatCurrency(stock.realizedPnL) }}</div></div><div class="text-center md:text-left"><div class="text-xs text-slate-400 mb-1 font-bold uppercase">報酬率</div><div class="font-black text-xl" :class="stock.roi >= 0 ? 'text-up' : 'text-down'">{{ stock.roi }}%</div></div></div><div class="w-full lg:w-auto flex gap-3"><div class="flex flex-col gap-1"><button type="button" @click.stop="moveHoldingCardByStep(stock.code, -1, 'holdings')" :disabled="idx === 0" class="w-9 h-8 rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30" title="上移"><i class="fa-solid fa-chevron-up"></i></button><button type="button" @click.stop="moveHoldingCardByStep(stock.code, 1, 'holdings')" :disabled="idx === filteredHoldings.length - 1" class="w-9 h-8 rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30" title="下移"><i class="fa-solid fa-chevron-down"></i></button></div><button @click="openStockDetails(stock)" class="btn btn-secondary w-full lg:w-auto shadow-sm"><i class="fa-solid fa-pen-to-square mr-2"></i> 編輯</button><button @click="openSellModal(stock)" class="btn btn-secondary w-full lg:w-auto !border-red-200 !text-red-500 hover:!bg-red-500 hover:!text-white shadow-sm"><i class="fa-solid fa-arrow-right-from-bracket mr-2"></i> 賣出</button></div></div></div></div></div>
            </div>

            <div v-if="currentTab === 'inventory' && !showStockDetails && holdings.length" class="mt-6 mb-5 space-y-3">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-2">
                    <div>
                        <h2 class="text-xl font-black text-slate-800 flex items-center gap-2"><i class="fa-solid fa-radar text-cyan-600"></i> 持股分析雷達</h2>
                        <div class="text-xs md:text-sm font-bold text-slate-500 mt-1">摘要預設收合在持股列表後方；需要時再展開查看每檔詳細分析。</div>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <button @click="showHoldingRadarDetails = !showHoldingRadarDetails" class="h-11 px-4 rounded-2xl font-black bg-white border-2 border-cyan-100 text-cyan-700 hover:bg-cyan-50 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
                            <i class="fa-solid" :class="showHoldingRadarDetails ? 'fa-chevron-up' : 'fa-chart-simple'"></i>
                            {{ showHoldingRadarDetails ? '收合詳細分析' : '展開詳細分析' }}
                        </button>
                        <button @click="queryAllHoldingChipData" :disabled="chipBatchLoading || chipLoading || stockRiskLoading || !holdings.length" class="h-11 px-4 rounded-2xl font-black text-white bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
                            <i class="fa-solid" :class="chipBatchLoading ? 'fa-spinner fa-spin' : 'fa-layer-group'"></i>
                            {{ chipBatchLoading ? ('查持股 ' + chipBatchDone + '/' + chipBatchTotal) : '一鍵更新分析' }}
                        </button>
                    </div>
                </div>
                <div v-if="portfolioRiskRadar" @click="showHoldingRadarDetails = !showHoldingRadarDetails" class="rounded-3xl border p-4 md:p-5 shadow-sm cursor-pointer hover:shadow-md transition-all" :class="portfolioRiskRadar.className">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div class="flex items-start gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-white/80 border border-current/10 flex items-center justify-center shrink-0"><i class="fa-solid text-lg" :class="portfolioRiskRadar.icon"></i></div>
                            <div>
                                <div class="flex flex-wrap items-center gap-2"><span class="text-xs font-black px-2.5 py-1 rounded-full bg-white/80 border border-current/10">{{ portfolioRiskRadar.signal }}</span><span class="text-lg font-black">{{ portfolioRiskRadar.title }}</span></div>
                                <div class="mt-1 text-sm font-bold opacity-80">共 {{ portfolioRiskRadar.total }} 檔，偏正向 {{ portfolioRiskRadar.positive }} 檔，偏弱 {{ portfolioRiskRadar.weak }} 檔，高風險 {{ portfolioRiskRadar.highRisk }} 檔，待查 {{ portfolioRiskRadar.missing }} 檔。</div>
                            </div>
                        </div>
                        <div class="text-xs font-bold bg-white/70 border border-current/10 rounded-2xl px-3 py-2">點擊摘要可展開／收合每檔詳細分析。詳細卡片內仍可拖曳排序。</div>
                        <button v-if="hasCustomHoldingOrder" type="button" @click.stop="resetHoldingCardOrder" class="text-xs font-black bg-white/80 border border-current/10 rounded-2xl px-3 py-2 hover:bg-white transition"><i class="fa-solid fa-arrow-rotate-left mr-1"></i>恢復預設排序</button>
                    </div>
                </div>
                <div v-if="showHoldingRadarDetails" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div v-for="(card, idx) in holdingAnalysisCards" :key="card.code" draggable="true" @dragstart="onHoldingCardDragStart(card.code)" @dragover.prevent="onHoldingCardDragOver(card.code)" @dragleave="onHoldingCardDragLeave(card.code)" @drop.prevent="onHoldingCardDrop(card.code, 'analysis')" @dragend="onHoldingCardDragEnd" @click="loadHoldingAnalysis(card.code)" class="text-left rounded-3xl border p-4 md:p-5 shadow-sm hover:shadow-md active:scale-[0.995] transition-all cursor-pointer select-none" :class="[card.className, dragOverHoldingCode === card.code ? 'ring-4 ring-cyan-300 ring-offset-2' : '', draggingHoldingCode === card.code ? 'opacity-50 scale-[0.99]' : '']">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2"><i class="fa-solid fa-grip-vertical opacity-40 cursor-grab active:cursor-grabbing" title="拖曳排序"></i><span class="font-black text-slate-900 text-lg">{{ card.name || card.code }}</span><span class="text-xs font-black text-slate-400">{{ card.code }}</span><span class="text-[11px] font-black px-2 py-0.5 rounded-full" :class="card.badgeClass">{{ card.signal }}</span></div>
                                <div class="mt-1 font-black">{{ card.title }}</div>
                            </div>
                            <div class="shrink-0 flex items-center gap-2"><div class="flex flex-col gap-1"><button type="button" @click.stop="moveHoldingCardByStep(card.code, -1, 'analysis')" :disabled="idx === 0" class="w-7 h-6 rounded-lg bg-white/70 border border-current/10 text-xs disabled:opacity-30" title="上移"><i class="fa-solid fa-chevron-up"></i></button><button type="button" @click.stop="moveHoldingCardByStep(card.code, 1, 'analysis')" :disabled="idx === holdingAnalysisCards.length - 1" class="w-7 h-6 rounded-lg bg-white/70 border border-current/10 text-xs disabled:opacity-30" title="下移"><i class="fa-solid fa-chevron-down"></i></button></div><div class="w-10 h-10 rounded-2xl bg-white/80 border border-current/10 flex items-center justify-center"><i class="fa-solid" :class="card.icon"></i></div></div>
                        </div>
                        <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div class="rounded-2xl bg-white/70 border border-current/10 px-3 py-2"><div class="text-[11px] font-bold opacity-70">未實現</div><div class="font-black" :class="card.unrealizedPnL >= 0 ? 'text-up' : 'text-down'">{{ card.unrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(card.unrealizedPnL) }}</div></div>
                            <div class="rounded-2xl bg-white/70 border border-current/10 px-3 py-2"><div class="text-[11px] font-bold opacity-70">報酬率</div><div class="font-black" :class="card.roi >= 0 ? 'text-up' : 'text-down'">{{ card.roi }}%</div></div>
                        </div>
                        <div class="mt-3 text-sm font-bold leading-relaxed opacity-90">{{ card.action }}</div>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <span v-for="(r, idx) in card.reasons" :key="idx" class="text-[11px] md:text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 border border-current/10">{{ r }}</span>
                        </div>
                        <div class="mt-3 text-[11px] font-bold opacity-60">{{ card.hasChip ? ('籌碼更新：' + (card.fetchedAtLabel || '-')) : (card.hasPartialChip ? ('部分資料：' + (card.fetchedAtLabel || '-')) : '尚無籌碼快取') }}</div>
                    </div>
                </div>
            </div>

            
            <div v-if="currentTab === 'inventory' && showStockDetails" class="space-y-6"><div class="flex items-center justify-between px-2"><div class="flex items-center gap-3"><button type="button" @click="closeStockDetails" class="btn btn-secondary !rounded-xl !px-4 !py-3"><i class="fa-solid fa-arrow-left mr-2"></i>返回</button><div><div class="text-xl font-black text-slate-800 leading-tight">{{ selectedStock?.name }} <span class="text-slate-400 font-bold">({{ selectedStock?.code }})</span></div><div class="text-sm text-slate-500 font-medium mt-1">交易明細（僅顯示買入紀錄）</div></div></div></div><div class="card !p-0 overflow-hidden"><div class="px-6 py-4 border-b border-slate-200 bg-slate-50"><h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-receipt text-slate-400"></i> 購買明細</h3></div><div v-if="selectedStockBuys.length === 0" class="text-center py-16 text-slate-400"><i class="fa-solid fa-circle-info text-3xl mb-3 opacity-50"></i><div class="font-bold">沒有買入紀錄</div></div><div v-else><div class="md:hidden divide-y divide-slate-100"><div v-for="(row, idx) in selectedStockBuys" :key="idx" class="px-6 py-5"><div class="flex items-center justify-between"><div class="text-sm font-extrabold text-slate-700">{{ row.date }}</div><div class="text-xs font-bold text-slate-500">買入</div></div><div class="mt-3 grid grid-cols-3 gap-3 text-sm"><div class="bg-slate-50 rounded-xl p-3 border border-slate-200"><div class="text-[11px] font-bold text-slate-500 mb-1">購買股數</div><div class="text-base font-black text-slate-800">{{ formatCurrency(row.qty) }}</div></div><div class="bg-slate-50 rounded-xl p-3 border border-slate-200"><div class="text-[11px] font-bold text-slate-500 mb-1">單價</div><div class="text-base font-black text-slate-800">{{ formatPrice2(row.price) }}</div></div><div class="bg-slate-50 rounded-xl p-3 border border-slate-200"><div class="text-[11px] font-bold text-slate-500 mb-1">小計</div><div class="text-base font-black text-slate-800">{{ formatCurrency(row.price * row.qty) }}</div></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" @click="openEditBuyModal(row)" class="px-3 py-2 rounded-lg text-xs font-black bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition"><i class="fa-solid fa-pen-to-square mr-1"></i> 編輯</button><button type="button" @click="deleteTransaction(row.id)" class="px-3 py-2 rounded-lg text-xs font-black bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition"><i class="fa-solid fa-trash-can mr-1"></i> 刪除</button></div></div></div><div class="hidden md:block overflow-x-auto"><table class="w-full min-w-[720px]"><thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider"><tr><th class="px-6 py-4 text-left font-bold">購買日期</th><th class="px-6 py-4 text-right font-bold">購買股數</th><th class="px-6 py-4 text-right font-bold">單價</th><th class="px-6 py-4 text-right font-bold">小計</th><th class="px-6 py-4 text-right font-bold">操作</th></tr></thead><tbody><tr v-for="(row, idx) in selectedStockBuys" :key="idx" class="border-t border-slate-100 hover:bg-slate-50/60"><td class="px-6 py-4 font-bold text-slate-700">{{ row.date }}</td><td class="px-6 py-4 text-right font-bold text-slate-700">{{ formatCurrency(row.qty) }}</td><td class="px-6 py-4 text-right font-bold text-slate-700">{{ formatPrice2(row.price) }}</td><td class="px-6 py-4 text-right font-black text-slate-800">{{ formatCurrency(row.price * row.qty) }}</td><td class="px-6 py-4 text-right"><div class="flex justify-end gap-2"><button type="button" @click="openEditBuyModal(row)" class="px-3 py-2 rounded-lg text-xs font-black bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition"><i class="fa-solid fa-pen-to-square"></i></button><button type="button" @click="deleteTransaction(row.id)" class="px-3 py-2 rounded-lg text-xs font-black bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition"><i class="fa-solid fa-trash-can"></i></button></div></td></tr></tbody></table></div></div></div></div>
        </div>

        <div v-show="currentTab === 'history'">
            
            <div class="sub-tab-container">
                <div @click="historyMode = 'list'" :class="['sub-tab-item', historyMode === 'list' ? 'active' : '']">
                    <i class="fa-solid fa-list-ul mr-2"></i> 交易流水帳 <span class="ml-2 text-[11px] font-black px-2 py-0.5 rounded-full" :class="dateFilterMode==='thisMonth' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">{{ ({'thisMonth':'當月','lastMonth':'上個月','today':'今日','yesterday':'昨日','week':'近一週','month':'近一月','all':'全部'}[dateFilterMode] || '區間') }}</span>
                </div>
                <div @click="historyMode = 'analysis'" :class="['sub-tab-item', historyMode === 'analysis' ? 'active' : '']">
                    <i class="fa-solid fa-chart-pie mr-2"></i> 已實現損益 <span class="ml-2 text-[11px] font-black px-2 py-0.5 rounded-full" :class="dateFilterMode==='thisMonth' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">{{ ({'thisMonth':'當月','lastMonth':'上個月','today':'今日','yesterday':'昨日','week':'近一週','month':'近一月','all':'全部'}[dateFilterMode] || '區間') }}</span>
                </div>
            </div>

            <div v-if="historyMode === 'list'">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">區間已實現損益</div><div class="text-2xl font-black" :class="filteredStats.realizedPnL >= 0 ? 'text-up' : 'text-down'">{{ filteredStats.realizedPnL > 0 ? '+' : '' }}{{ formatCurrency(filteredStats.realizedPnL) }}</div></div>
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">區間交易費用</div><div class="text-xl font-bold text-slate-600">{{ formatCurrency(filteredStats.fees) }}</div></div>
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">區間買入總額</div><div class="text-xl font-bold text-slate-800">{{ formatCurrency(filteredStats.buyAmount) }}</div></div>
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">區間賣出總額</div><div class="text-xl font-bold text-slate-800">{{ formatCurrency(filteredStats.sellAmount) }}</div></div>
                </div>
                
                <div class="card !p-5 !mb-6">
                    <div class="hidden md:flex flex-col xl:flex-row gap-4 items-center justify-between">
                        <div class="flex gap-3 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 scrollbar-hide">
                            <button v-for="mode in ['thisMonth','lastMonth','today','yesterday','week','month','all']" @click="setDateFilter(mode)" class="filter-btn whitespace-nowrap px-6 py-3 text-sm" :class="{ active: dateFilterMode === mode}">{{ {'thisMonth':'當月','lastMonth':'上個月','today':'今日','yesterday':'昨日','week':'近一週','month':'近一月','all':'全部'}[mode] }}</button>
                        </div>
                        <div class="flex gap-3 w-full xl:w-auto">
                            <div class="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border-2 border-slate-200 shadow-sm flex-1"><i class="fa-regular fa-calendar text-slate-400"></i><input type="date" v-model="filterStart" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-32 cursor-pointer"><span class="text-slate-300 font-bold">➜</span><input type="date" v-model="filterEnd" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-32 cursor-pointer"></div>
                            <button @click="triggerClearHistory" class="btn bg-gradient-to-r from-rose-500 to-red-600 text-white !shadow-none !h-auto !px-6 !py-3 !text-sm !rounded-full whitespace-nowrap active:opacity-90"><i class="fa-solid fa-trash-can mr-2"></i> 清空</button>
                        </div>
                    </div>
                    <div class="md:hidden flex flex-col gap-4">
                        <div class="relative">
                            <select v-model="dateFilterMode" @change="setDateFilter(dateFilterMode)" class="w-full h-12 pl-4 pr-10 bg-slate-100 border-2 border-slate-200 rounded-xl text-slate-700 font-bold appearance-none outline-none focus:border-blue-500 transition-colors"><option value="thisMonth">🈷️ 當月</option><option value="lastMonth">⏮️ 上個月</option><option value="today">📅 今日</option><option value="yesterday">⏮️ 昨日</option><option value="week">🗓️ 近一週</option><option value="month">🈷️ 近一月</option><option value="all">♾️ 全部</option></select>
                            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><i class="fa-solid fa-chevron-down"></i></div>
                        </div>
                        <div class="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200"><input type="date" v-model="filterStart" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-full text-center"><span class="text-slate-300 font-bold">➜</span><input type="date" v-model="filterEnd" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-full text-center"></div>
                        <button @click="triggerClearHistory" class="btn bg-gradient-to-r from-rose-500 to-red-600 text-white !shadow-none w-2/3 mx-auto !h-12 !text-sm !rounded-full active:scale-95 transition-transform"><i class="fa-solid fa-trash-can mr-2"></i> 清空所有紀錄</button>
                    </div>
                </div>

                <div class="flex items-center justify-between mb-4">
                    <div class="flex gap-2">
                        <button @click="historyTypeFilter = (historyTypeFilter === 'buy' ? 'all' : 'buy')" class="px-4 py-2 rounded-xl text-sm font-bold border transition" :class="historyTypeFilter === 'buy' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">買入</button>
                        <button @click="historyTypeFilter = (historyTypeFilter === 'sell' ? 'all' : 'sell')" class="px-4 py-2 rounded-xl text-sm font-bold border transition" :class="historyTypeFilter === 'sell' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">賣出</button>
                    </div>
                    <button v-if="historyTypeFilter !== 'all'" @click="historyTypeFilter = 'all'" class="text-xs font-bold text-slate-500 hover:text-slate-700">清除篩選</button>
                </div>

                <div class="md:hidden space-y-4">
                    <div v-for="tx in displayedHistoryTransactions" :key="tx.id" class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <div class="flex justify-between items-start mb-3">
                            <div class="text-xs font-bold text-slate-400 flex items-center gap-2"><i class="fa-regular fa-calendar"></i> {{ tx.date }}</div>
                            <div class="flex items-center gap-2"><button @click="openEditTxModal(tx)" class="text-slate-300 hover:text-slate-700 p-1" title="編輯"><i class="fa-solid fa-pen-to-square"></i></button><button @click="deleteTransaction(tx.id)" class="text-slate-300 hover:text-red-500 p-1"><i class="fa-solid fa-trash-can"></i></button></div>
                        </div>
                        <div class="flex justify-between items-center mb-3">
                            <div class="flex items-center gap-3"><span class="px-2.5 py-1 rounded-lg text-xs font-black" :class="tx.type === 'buy' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'">{{ txTypeLabel(tx) }}</span><div><div class="font-black text-slate-800 text-lg leading-tight">{{ displayNameOnly(tx.code, tx.name) }}</div><div class="text-[10px] font-bold text-slate-400">{{ tx.code }}</div></div></div>
                            <div class="text-right"><div class="font-black text-lg text-slate-800">{{ formatCurrency(tx.totalAmount) }}</div><div class="text-[10px] font-bold text-slate-400">總金額</div></div>
                        </div>
                        <div class="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100">
                            <div class="text-xs font-bold text-slate-600">{{ tx.price }} <span class="text-slate-400 mx-1">x</span> {{ formatCurrency(tx.qty) }} <span class="text-slate-400 text-[10px] ml-1">(費 {{formatCurrency(tx.fee + (tx.tax||0))}})</span></div>
                            <div v-if="tx.realizedPnL !== null" class="font-black text-base" :class="tx.realizedPnL >= 0 ? 'text-up' : 'text-down'">{{ tx.realizedPnL > 0 ? '+' : '' }}{{ formatCurrency(tx.realizedPnL) }}</div>
                            <div v-else class="text-slate-300 font-bold text-sm">-</div>
                        </div>
                    </div>
                    <div v-if="displayedHistoryTransactions.length === 0" class="text-center py-12 text-slate-400 font-bold bg-white rounded-3xl border-2 border-dashed border-slate-200">此區間無交易紀錄</div>
                </div>

                <div class="hidden md:block card p-0 overflow-hidden border-0">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead><tr class="bg-slate-100 text-slate-500 border-b border-slate-200"><th class="p-5 pl-8 whitespace-nowrap font-bold">日期</th><th class="p-5 whitespace-nowrap font-bold">股名</th><th class="p-5 whitespace-nowrap font-bold">買賣</th><th class="p-5 text-right whitespace-nowrap font-bold">價格</th><th class="p-5 text-right whitespace-nowrap font-bold">股數</th><th class="p-5 text-right whitespace-nowrap font-bold">費用</th><th class="p-5 text-right whitespace-nowrap font-bold">總金額</th><th class="p-5 text-right whitespace-nowrap font-bold">損益</th><th class="p-5 text-center whitespace-nowrap font-bold">操作</th></tr></thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="tx in displayedHistoryTransactions" :key="tx.id" class="hover:bg-slate-50 transition bg-white">
                                    <td class="p-5 pl-8 text-slate-600 font-bold whitespace-nowrap">{{ tx.date }}</td>
                                    <td class="p-5 whitespace-nowrap"><div class="font-bold text-slate-800 text-base">{{ displayNameOnly(tx.code, tx.name) }}</div><div class="text-xs text-slate-400 font-bold">{{ tx.code }}</div></td>
                                    <td class="p-5 whitespace-nowrap"><span class="px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm" :class="tx.type === 'buy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">{{ txTypeLabel(tx) }}</span></td>
                                    <td class="p-5 text-right font-bold text-slate-600">{{ tx.price }}</td><td class="p-5 text-right text-slate-600 font-medium">{{ formatCurrency(tx.qty) }}</td><td class="p-5 text-right text-slate-400 text-xs font-medium">{{ formatCurrency(tx.fee + (tx.tax || 0)) }}</td>
                                    <td class="p-5 text-right font-bold text-slate-800">{{ formatCurrency(tx.totalAmount) }}</td>
                                    <td class="p-5 text-right font-black text-base"><span v-if="tx.realizedPnL !== null" :class="tx.realizedPnL >= 0 ? 'text-up' : 'text-down'">{{ tx.realizedPnL > 0 ? '+' : '' }}{{ formatCurrency(tx.realizedPnL) }}</span><span v-else class="text-slate-300">-</span></td>
                                    <td class="p-5 text-center"><div class="flex items-center justify-center gap-2"><button @click="openEditTxModal(tx)" class="text-slate-300 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition" title="編輯"><i class="fa-solid fa-pen-to-square"></i></button><button @click="deleteTransaction(tx.id)" class="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="刪除"><i class="fa-solid fa-trash-can"></i></button></div></td>
                                </tr>
                                <tr v-if="displayedHistoryTransactions.length === 0"><td colspan="9" class="p-12 text-center text-slate-400 font-bold">此區間無交易紀錄</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div v-if="historyMode === 'analysis'">

                <div class="bg-white p-4 rounded-2xl border border-slate-200 mb-6 text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="font-black text-slate-700">區間：</span>
                        <span class="font-black" :class="dateFilterMode==='thisMonth' ? 'text-emerald-700' : 'text-slate-700'">
                            {{ ({'thisMonth':'當月','lastMonth':'上個月','today':'今日','yesterday':'昨日','week':'近一週','month':'近一月','all':'全部'}[dateFilterMode] || '區間') }}
                        </span>
                        <span class="text-xs text-slate-400 font-bold hidden sm:inline">（{{ filterStart }} ～ {{ filterEnd }}）</span>
                    </div>
                    <button type="button" @click="historyMode='list'" class="self-start sm:self-auto text-blue-600 font-black hover:underline underline-offset-4">
                        到交易流水帳調整
                    </button>
                </div>

                <div class="mb-6 space-y-5">
                    <div class="flex items-center justify-between px-1">
                        <div>
                            <h3 class="text-xl font-black text-slate-800 flex items-center gap-2"><i class="fa-solid fa-chart-column text-indigo-500"></i>月損益統計</h3>
                            <p class="text-xs font-bold text-slate-400 mt-1">依已實現損益計算，幫你比較本月、上月與今年交易狀況。</p>
                        </div>
                        <div class="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-black">
                            {{ monthlyProfitStats.year }} 年統計
                        </div>
                    </div>

                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">本月已實現損益</div><div class="text-2xl font-black" :class="monthlyProfitStats.thisMonthPnL >= 0 ? 'text-up' : 'text-down'">{{ monthlyProfitStats.thisMonthPnL > 0 ? '+' : '' }}{{ formatCurrency(monthlyProfitStats.thisMonthPnL) }}</div></div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">上月已實現損益</div><div class="text-2xl font-black" :class="monthlyProfitStats.lastMonthPnL >= 0 ? 'text-up' : 'text-down'">{{ monthlyProfitStats.lastMonthPnL > 0 ? '+' : '' }}{{ formatCurrency(monthlyProfitStats.lastMonthPnL) }}</div></div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">今年累積損益</div><div class="text-2xl font-black" :class="monthlyProfitStats.yearPnL >= 0 ? 'text-up' : 'text-down'">{{ monthlyProfitStats.yearPnL > 0 ? '+' : '' }}{{ formatCurrency(monthlyProfitStats.yearPnL) }}</div></div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">勝率</div><div class="text-2xl font-black text-slate-800">{{ monthlyProfitStats.winRate }}%</div><div class="text-xs text-slate-400 font-bold mt-1">獲利 {{ monthlyProfitStats.winCount }} 筆 / 已實現 {{ monthlyProfitStats.tradeCount }} 筆</div></div>
                    </div>

                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">平均獲利</div><div class="text-xl font-black text-up">+{{ formatCurrency(monthlyProfitStats.avgProfit) }}</div></div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">平均虧損</div><div class="text-xl font-black text-down">{{ monthlyProfitStats.avgLoss < 0 ? '-' : '' }}{{ formatCurrency(Math.abs(monthlyProfitStats.avgLoss)) }}</div></div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">最大單筆獲利</div><div class="text-xl font-black text-up">+{{ formatCurrency(monthlyProfitStats.maxProfit) }}</div></div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">最大單筆虧損</div><div class="text-xl font-black text-down">{{ monthlyProfitStats.maxLoss < 0 ? '-' : '' }}{{ formatCurrency(Math.abs(monthlyProfitStats.maxLoss)) }}</div></div>
                    </div>

                    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 overflow-hidden">
                        <div class="flex items-center justify-between mb-5">
                            <div><div class="text-sm font-black text-slate-700">每月損益長條圖</div><div class="text-xs font-bold text-slate-400 mt-1">紅色為獲利、綠色為虧損，月份依今年 1～12 月排列。</div></div>
                            <div class="text-xs font-black text-slate-400">最大月波動：{{ formatCurrency(monthlyProfitStats.maxAbsMonthPnL) }}</div>
                        </div>
                        <div class="h-56 flex items-end gap-2 md:gap-3 border-b border-slate-200 pb-3 overflow-x-auto">
                            <div v-for="m in monthlyProfitStats.months" :key="m.key" class="min-w-[48px] md:min-w-0 flex-1 flex flex-col items-center justify-end gap-2 h-full">
                                <div class="text-[10px] font-black whitespace-nowrap" :class="m.pnl >= 0 ? 'text-up' : 'text-down'">{{ m.pnl > 0 ? '+' : '' }}{{ formatCurrency(m.pnl) }}</div>
                                <div class="w-full max-w-[34px] rounded-t-xl transition-all" :class="m.pnl >= 0 ? 'bg-red-400/80' : 'bg-emerald-500/80'" :style="{ height: m.barHeight + '%' }"></div>
                            </div>
                        </div>
                        <div class="mt-3 flex gap-2 md:gap-3 overflow-x-auto text-center text-[11px] font-black text-slate-400">
                            <div v-for="m in monthlyProfitStats.months" :key="m.key + '-label'" class="min-w-[48px] md:min-w-0 flex-1">{{ m.label }}</div>
                        </div>
                    </div>
                </div>

                <div class="mb-6 space-y-5">
                    <div class="flex items-center justify-between px-1">
                        <div>
                            <h3 class="text-xl font-black text-slate-800 flex items-center gap-2"><i class="fa-solid fa-trophy text-amber-500"></i>交易勝率分析</h3>
                            <p class="text-xs font-bold text-slate-400 mt-1">以區間內「賣出完成」且已實現損益的交易計算，檢查交易品質是否變好。</p>
                        </div>
                        <div class="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-black border border-amber-100">
                            已完成 {{ tradingWinRateStats.totalTrades }} 筆
                        </div>
                    </div>

                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">勝率</div>
                            <div class="text-2xl font-black text-slate-800">{{ tradingWinRateStats.winRate }}%</div>
                            <div class="text-xs text-slate-400 font-bold mt-1">賺 {{ tradingWinRateStats.winCount }} 筆 / 賠 {{ tradingWinRateStats.lossCount }} 筆</div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">平均持有天數</div>
                            <div class="text-2xl font-black text-slate-800">{{ tradingWinRateStats.avgHoldingDays }} 天</div>
                            <div class="text-xs text-slate-400 font-bold mt-1">同日當沖以 0 天計</div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">平均獲利率</div>
                            <div class="text-2xl font-black text-up">+{{ tradingWinRateStats.avgProfitRate }}%</div>
                            <div class="text-xs text-slate-400 font-bold mt-1">只計賺錢交易</div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">平均虧損率</div>
                            <div class="text-2xl font-black text-down">-{{ tradingWinRateStats.avgLossRateAbs }}%</div>
                            <div class="text-xs text-slate-400 font-bold mt-1">只計賠錢交易</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">賺錢筆數</div>
                            <div class="text-xl font-black text-up">{{ tradingWinRateStats.winCount }} 筆</div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">賠錢筆數</div>
                            <div class="text-xl font-black text-down">{{ tradingWinRateStats.lossCount }} 筆</div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">賺賠比</div>
                            <div class="text-xl font-black text-slate-800">{{ tradingWinRateStats.rewardRiskRatio }} 倍</div>
                            <div class="text-xs text-slate-400 font-bold mt-1">平均獲利率 ÷ 平均虧損率</div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div class="text-xs text-slate-400 font-bold mb-1">損益結構</div>
                            <div class="text-xl font-black" :class="tradingWinRateStats.netPnL >= 0 ? 'text-up' : 'text-down'">{{ tradingWinRateStats.netPnL > 0 ? '+' : '' }}{{ formatCurrency(tradingWinRateStats.netPnL) }}</div>
                            <div class="text-xs text-slate-400 font-bold mt-1">區間賣出已實現</div>
                        </div>
                    </div>

                    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <div class="text-sm font-black text-slate-700">勝率結構</div>
                                <div class="text-xs font-bold text-slate-400 mt-1">快速看賺錢交易與賠錢交易比例。</div>
                            </div>
                            <div class="text-xs font-black text-slate-400">總計 {{ tradingWinRateStats.totalTrades }} 筆</div>
                        </div>
                        <div class="h-5 rounded-full overflow-hidden bg-slate-100 flex border border-slate-200">
                            <div class="bg-red-400/80 transition-all" :style="{ width: tradingWinRateStats.winBarWidth + '%' }"></div>
                            <div class="bg-emerald-500/80 transition-all" :style="{ width: tradingWinRateStats.lossBarWidth + '%' }"></div>
                        </div>
                        <div class="mt-3 flex justify-between text-xs font-black text-slate-500">
                            <span class="text-up">賺錢 {{ tradingWinRateStats.winCount }} 筆</span>
                            <span class="text-down">賠錢 {{ tradingWinRateStats.lossCount }} 筆</span>
                        </div>
                    </div>
                </div>
                
                <div v-if="false" class="card !p-5 !mb-6">
                    <div class="hidden md:flex flex-col xl:flex-row gap-4 items-center justify-between">
                        <div class="flex gap-3 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 scrollbar-hide">
                            <button v-for="mode in ['today','yesterday','week','month','all']" @click="setDateFilter(mode)" class="filter-btn whitespace-nowrap px-6 py-3 text-sm" :class="{ active: dateFilterMode === mode}">{{ {'today':'今日','yesterday':'昨日','week':'近一週','month':'近一月','all':'全部'}[mode] }}</button>
                        </div>
                        <div class="flex gap-3 w-full xl:w-auto">
                            <div class="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border-2 border-slate-200 shadow-sm flex-1"><i class="fa-regular fa-calendar text-slate-400"></i><input type="date" v-model="filterStart" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-32 cursor-pointer"><span class="text-slate-300 font-bold">➜</span><input type="date" v-model="filterEnd" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-32 cursor-pointer"></div>
                        </div>
                    </div>
                    <div class="md:hidden flex flex-col gap-4">
                        <div class="relative">
                            <select v-model="dateFilterMode" @change="setDateFilter(dateFilterMode)" class="w-full h-12 pl-4 pr-10 bg-slate-100 border-2 border-slate-200 rounded-xl text-slate-700 font-bold appearance-none outline-none focus:border-blue-500 transition-colors">
                                <option value="today">📅 今日</option><option value="yesterday">⏮️ 昨日</option><option value="week">🗓️ 近一週</option><option value="month">🈷️ 近一月</option><option value="all">♾️ 全部</option>
                            </select>
                            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><i class="fa-solid fa-chevron-down"></i></div>
                        </div>
                        <div class="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <input type="date" v-model="filterStart" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-full text-center">
                            <span class="text-slate-300 font-bold">➜</span>
                            <input type="date" v-model="filterEnd" class="bg-transparent text-sm font-bold text-slate-600 outline-none w-full text-center">
                        </div>
                    </div>
                </div>


                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">累計已實現損益</div><div class="text-2xl font-black" :class="totalRealizedPnL >= 0 ? 'text-up' : 'text-down'">{{ totalRealizedPnL > 0 ? '+' : '' }}{{ formatCurrency(totalRealizedPnL) }}</div></div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">已提領獲利</div><div class="text-2xl font-black text-rose-600">-{{ formatCurrency(profitWithdrawalsTotal) }}</div></div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">已補回獲利</div><div class="text-2xl font-black text-emerald-700">+{{ formatCurrency(profitRestoresTotal) }}</div></div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"><div class="text-xs text-slate-400 font-bold mb-1">可用獲利</div><div class="text-2xl font-black" :class="availableRealizedProfit >= 0 ? 'text-up' : 'text-down'">{{ availableRealizedProfit > 0 ? '+' : '' }}{{ formatCurrency(availableRealizedProfit) }}</div></div>
                </div>

                <div v-if="realizedAnalysisList.length === 0" class="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-300 text-slate-400">
                    <i class="fa-solid fa-chart-pie text-6xl mb-4 opacity-30"></i>
                    <p class="font-bold text-lg">此區間內無已實現損益資料</p>
                </div>

                <div class="md:hidden space-y-4">
                    <div v-for="item in realizedAnalysisList" :key="item.code" @click="openRealizedDetail(item.code)" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 cursor-pointer active:bg-blue-50 transition-colors">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">{{ item.code }}</div>
                                <div><div class="font-black text-slate-800 text-lg">{{ displayNameOnly(item.code, item.name) }}</div><div class="text-xs text-slate-400 font-bold">最新賣出: {{ item.latestDate }}</div></div>
                            </div>
                            <div class="text-right">
                                <div class="font-black text-xl" :class="item.totalPnL >= 0 ? 'text-up' : 'text-down'">{{ item.totalPnL > 0 ? '+' : '' }}{{ formatCurrency(item.totalPnL) }}</div>
                                <div class="text-xs font-bold text-slate-400">區間損益</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div><div class="text-[10px] text-slate-400 font-bold">平均賣出價</div><div class="font-bold text-slate-700">{{ formatPrice2(item.avgPrice) }}</div></div>
                             <div class="text-right"><div class="text-[10px] text-slate-400 font-bold">報酬率 (ROI)</div><div class="font-bold" :class="item.roi >= 0 ? 'text-up' : 'text-down'">{{ item.roi }}%</div></div>
                        </div>
                    </div>
                </div>

                <div class="hidden md:block card p-0 overflow-hidden border-0" v-if="realizedAnalysisList.length > 0">
                    <table class="w-full text-left text-sm">
                        <thead><tr class="bg-blue-50/50 text-slate-500 border-b border-blue-100"><th class="p-5 pl-8 font-bold">股票名稱</th><th class="p-5 text-right font-bold">最新賣出日期</th><th class="p-5 text-right font-bold">累計賣出股數</th><th class="p-5 text-right font-bold">平均賣出價</th><th class="p-5 text-right font-bold">區間總損益</th><th class="p-5 text-right font-bold">報酬率</th><th class="p-5 text-center font-bold">明細</th></tr></thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr v-for="item in realizedAnalysisList" :key="item.code" @click="openRealizedDetail(item.code)" class="hover:bg-blue-50/30 cursor-pointer transition bg-white group">
                                <td class="p-5 pl-8"><div class="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">{{ displayNameOnly(item.code, item.name) }} <span class="text-xs text-slate-400 ml-1 font-normal">{{ item.code }}</span></div></td>
                                <td class="p-5 text-right font-bold text-slate-600">{{ item.latestDate }}</td>
                                <td class="p-5 text-right font-bold text-slate-600">{{ formatCurrency(item.totalQty) }}</td>
                                <td class="p-5 text-right font-bold text-slate-600">{{ formatPrice2(item.avgPrice) }}</td>
                                <td class="p-5 text-right font-black text-lg" :class="item.totalPnL >= 0 ? 'text-up' : 'text-down'">{{ item.totalPnL > 0 ? '+' : '' }}{{ formatCurrency(item.totalPnL) }}</td>
                                <td class="p-5 text-right font-bold text-base" :class="item.roi >= 0 ? 'text-up' : 'text-down'">{{ item.roi }}%</td>
                                <td class="p-5 text-center text-slate-300 group-hover:text-blue-500"><i class="fa-solid fa-angle-right"></i></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

        <div v-if="showRealizedDetail" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[90] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-300">
            <div class="bg-white w-full md:max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-none">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 class="text-xl font-black text-slate-800 flex items-center gap-2">
                             <span class="bg-blue-600 text-white text-xs px-2 py-1 rounded-lg">{{ realizedDetailCode }}</span>
                             交易明細紀錄
                        </h3>
                        <p class="text-xs text-slate-500 font-bold mt-1">顯示該股所有歷史買賣紀錄</p>
                    </div>
                    <button @click="closeRealizedDetail" class="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>
                
                <div class="flex-1 overflow-y-auto p-0 md:p-6 bg-slate-50">
                    <div class="md:hidden">
                        <div v-for="tx in realizedDetailTransactions" :key="tx.id" class="bg-white p-4 border-b border-slate-100 last:border-0">
                             <div class="flex justify-between items-center mb-2">
                                 <div class="text-xs font-bold text-slate-400">{{ tx.date }}</div>
                                 <span class="px-2 py-0.5 rounded text-[10px] font-black" :class="tx.type === 'buy' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'">{{ txTypeLabel(tx) }}</span>
                             </div>
                             <div class="flex justify-between items-center">
                                 <div class="font-bold text-slate-700 text-sm">{{ tx.price }} x {{ formatCurrency(tx.qty) }}</div>
                                 <div class="text-right">
                                     <div class="font-black text-sm text-slate-800">{{ formatCurrency(tx.totalAmount) }}</div>
                                     <div v-if="tx.type === 'sell'" class="text-xs font-bold" :class="tx.realizedPnL >= 0 ? 'text-up' : 'text-down'">損益: {{ tx.realizedPnL > 0 ? '+' : '' }}{{ formatCurrency(tx.realizedPnL) }}</div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div class="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 text-slate-500"><tr class="border-b border-slate-200"><th class="px-6 py-3 font-bold">日期</th><th class="px-6 py-3 font-bold">交易類別</th><th class="px-6 py-3 text-right font-bold">成交價</th><th class="px-6 py-3 text-right font-bold">股數</th><th class="px-6 py-3 text-right font-bold">費用(含稅)</th><th class="px-6 py-3 text-right font-bold">總金額</th><th class="px-6 py-3 text-right font-bold">損益</th></tr></thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="tx in realizedDetailTransactions" :key="tx.id" class="hover:bg-slate-50">
                                    <td class="px-6 py-3 font-bold text-slate-600">{{ tx.date }}</td>
                                    <td class="px-6 py-3"><span class="px-2 py-1 rounded text-xs font-bold" :class="tx.type === 'buy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">{{ txTypeLabel(tx) }}</span></td>
                                    <td class="px-6 py-3 text-right font-bold text-slate-700">{{ tx.price }}</td>
                                    <td class="px-6 py-3 text-right font-bold text-slate-700">{{ formatCurrency(tx.qty) }}</td>
                                    <td class="px-6 py-3 text-right text-xs text-slate-400">{{ formatCurrency(tx.fee + (tx.tax || 0)) }}</td>
                                    <td class="px-6 py-3 text-right font-bold text-slate-800">{{ formatCurrency(tx.totalAmount) }}</td>
                                    <td class="px-6 py-3 text-right font-black"><span v-if="tx.realizedPnL !== null" :class="tx.realizedPnL >= 0 ? 'text-up' : 'text-down'">{{ tx.realizedPnL > 0 ? '+' : '' }}{{ formatCurrency(tx.realizedPnL) }}</span><span v-else class="text-slate-300">-</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="contextMenu.visible" class="context-menu" ref="contextMenuEl" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
            <div class="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-500 border-b border-slate-200">設定狀態: {{ contextMenu.stock?.name }}</div>
            <div @click="setManualStatus(0, false)" class="context-item"><i class="fa-solid fa-circle-check text-green-500 w-5"></i> 恢復正常</div>
            <div @click="setManualStatus(0, true)" class="context-item"><i class="fa-solid fa-triangle-exclamation text-red-500 w-5"></i> 設為注意股</div>
            <div @click="setManualStatus(5, false)" class="context-item"> 處置 (5分)</div>
            <div @click="setManualStatus(20, false)" class="context-item"> 處置 (20分)</div>
        </div>

        <div v-if="showSellModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-start sm:items-center z-50 p-4 sm:p-6 transition-all duration-300 overflow-y-auto">
            <div class="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative border-2 border-white max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col">
                <button @click="showSellModal = false" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition"><i class="fa-solid fa-times text-xl"></i></button>
                <h3 class="text-2xl font-extrabold text-slate-800 mb-6 flex items-center"><i class="fa-solid fa-sack-dollar text-green-500 mr-3 text-3xl"></i> 股票賣出</h3>
                <div class="flex-1 overflow-y-auto pr-1 -mr-1">
                <div class="bg-slate-50 p-5 rounded-2xl mb-6 border border-slate-200 flex justify-between items-center shadow-inner">
                    <div><div class="font-black text-xl text-slate-800">{{ sellTx.name }}</div><div class="text-sm text-blue-600 font-bold">{{ sellTx.code }}</div></div>
                    <div class="text-right"><div class="text-xs text-slate-400 font-bold uppercase mb-1">庫存股數</div><div class="font-black text-2xl text-slate-800">{{ formatCurrency(sellTx.maxQty) }}</div></div>
                </div>
                <div class="space-y-6">
                    <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易日期</label><div class="relative flex items-center"><input type="date" v-model="sellTx.date" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm"><i class="fa-regular fa-calendar-days absolute left-4 text-slate-400 text-lg pointer-events-none"></i></div></div>
                    <div class="input-group">
                        <label class="text-xs font-bold text-slate-500 mb-2 ml-1">交易身分</label>
                        <div class="relative flex items-center">
                            <select v-model="sellTx.mode" class="w-full h-[50px] pl-11 pr-10 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm appearance-none cursor-pointer">
                                <option value="cash">現股</option>
                                <option value="margin">融資</option>
                            </select>
                            <i class="fa-solid fa-user-tag absolute left-4 text-slate-400 text-base pointer-events-none"></i>
                            <i class="fa-solid fa-chevron-down absolute right-4 text-slate-400 text-xs pointer-events-none"></i>
                        </div>
                        <div class="text-[11px] text-slate-400 font-bold mt-2">＊融券放空/回補請使用上方「新增交易紀錄」</div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
  <div class="input-group">
    <label class="text-xs font-bold text-slate-500 mb-2 ml-1">賣出價格</label>
    <div class="relative flex items-center">
      <input type="number" step="0.01" v-model.number="sellTx.price"
        class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm text-green-600">
      <i class="fa-solid fa-dollar-sign absolute left-4 text-slate-400 text-base pointer-events-none"></i>
    </div>
  </div>

  <div class="input-group">
    <div class="flex items-center justify-between mb-2 ml-1">
      <label class="text-xs font-bold text-slate-500">賣出股數</label>
      <button @click="sellTx.qty = sellTx.maxQty"
        class="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100 whitespace-nowrap shrink-0">
        全部賣出
      </button>
    </div>
    <div class="relative flex items-center">
      <input type="number" v-model.number="sellTx.qty"
        class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm"
        :max="sellTx.maxQty">
      <i class="fa-solid fa-cubes absolute left-4 text-slate-400 text-base pointer-events-none"></i>
    </div>
  </div>
</div><div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-bolt text-amber-500 text-lg"></i>
                            <div>
                                <div class="font-black text-slate-800">參與當沖配對</div>
                                <div class="text-xs text-slate-500 font-bold">配對成功的賣出部分使用稅率 {{ settings.dayTradeTaxRate }}%</div>
                            </div>
                        </div>
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="sellTx.dayTradeEligible" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-amber-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-slate-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                        </label>
                    </div>
                </div>
                </div>
                <div class="flex gap-4 mt-6 pt-4 border-t border-slate-100">
                    <button @click="showSellModal = false" class="h-[52px] w-1/3 rounded-xl font-bold text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 active:scale-95">取消</button>
                    <button @click="confirmSell" class="h-[52px] w-2/3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-600 shadow-xl shadow-emerald-300 hover:shadow-2xl hover:shadow-emerald-400 hover:-translate-y-1 transition-all duration-300 active:scale-95 flex items-center justify-center">確認賣出 <i class="fa-solid fa-check ml-2"></i></button>
                </div>
            </div>
        </div>


        <!-- Portfolio / Kids Books Modal -->
        <div v-if="showPortfolioModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4 transition-all duration-300">
          <div class="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative border-2 border-white max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col">
            <button @click="showPortfolioModal = false" class="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="text-2xl font-black text-slate-800 mb-2">投資帳本</h3>
            <p class="text-sm text-slate-500 font-medium mb-6">用多個帳本分開管理不同目的或成員的投資，不會混在一起。</p>

            <div class="flex-1 overflow-y-auto space-y-3 pr-1">
              <div v-for="p in portfolios" :key="p.id" class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <button @click="selectPortfolio(p.id)" class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md shadow-slate-900/10 ring-1 ring-white/30"
                        :class="currentPortfolioId === p.id ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : (p.id==='main' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-violet-500 to-fuchsia-600')">
                  <i class="fa-solid text-base" :class="currentPortfolioId === p.id ? 'fa-user-check fa-beat' : 'fa-user'"></i>
                </button>
                <div class="flex-1">
                  <div class="text-xs font-bold text-slate-500 mb-1">{{ p.id==='main' ? '我的帳戶' : '自訂帳本' }}</div>
                  <input v-model="p.name" @blur="savePortfolios" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition" />
                </div>
                <button v-if="p.id!=='main'" @click="deletePortfolio(p.id)" class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition" title="刪除帳本">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-200">
              <div class="text-xs font-bold text-slate-500 mb-2">新增帳本</div>
              <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 w-full">
                <input v-model="newPortfolioName" type="text" placeholder="例如：長期投資、家庭帳本…"
                       class="min-w-0 w-full h-11 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50" />
                <button @click="addPortfolio" class="h-11 px-4 rounded-xl font-black text-white bg-gradient-to-r from-emerald-400 to-teal-600 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-95 transition whitespace-nowrap">
                  新增
                </button>
              </div>
              <div class="text-[11px] text-slate-400 font-bold mt-2">提示：切換帳本後，庫存與歷史帳務都會自動切到該帳本的資料。</div>
            </div>
          </div>
        </div>

        <div v-if="showEditBuyModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-all duration-300">
          <div class="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative border-2 border-white max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col">
            <button @click="closeEditBuyModal" class="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="text-2xl font-black text-slate-800 mb-2">編輯買入紀錄</h3>
            <p class="text-sm text-slate-500 font-medium mb-6">可修正日期、價格、股數與分類。儲存後系統會重新計算費用與持倉成本。</p>
            <div class="space-y-4">
              <div><label class="block text-xs font-bold text-slate-500 mb-1">日期</label><input v-model="editBuyTx.date" type="date" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"/></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">分類</label><select v-model="editBuyTx.category" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label || cat.name }}</option></select></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">股票代號</label><input v-model="editBuyTx.code" type="text" disabled class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-bold text-slate-500"/></div>
              </div>
              <div><label class="block text-xs font-bold text-slate-500 mb-1">股票名稱</label><input v-model="editBuyTx.name" type="text" disabled class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-bold text-slate-500"/></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">買入價格</label><input v-model.number="editBuyTx.price" type="number" step="0.01" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"/></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">買入股數</label><input v-model.number="editBuyTx.qty" type="number" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"/></div>
              </div>
              <div class="flex gap-3 pt-2">
                <button @click="closeEditBuyModal" class="h-[54px] w-1/3 rounded-xl font-bold text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 active:scale-95">取消</button>
                <button @click="saveEditedBuy" class="h-[54px] w-2/3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl shadow-blue-300 hover:shadow-2xl hover:shadow-blue-400 hover:-translate-y-1 transition-all duration-300 active:scale-95 flex items-center justify-center">儲存修改 <i class="fa-solid fa-check ml-2"></i></button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showEditTxModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-all duration-300">
            <div class="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative border-2 border-white max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col">
                <button @click="closeEditTxModal" class="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"><i class="fa-solid fa-xmark text-lg"></i></button>
                <h3 class="text-2xl font-black text-slate-800 mb-2">編輯交易紀錄</h3>
                <p class="text-sm text-slate-500 font-medium mb-6">可修正日期、股名/代號、價格、股數與分類。儲存後系統會重新計算費用與賣出損益。</p>
                <div class="space-y-4">
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">日期</label><input v-model="editTx.date" type="date" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"/></div>
                    <div class="grid grid-cols-3 gap-3">
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">買賣</label><select v-model="editTx.type" disabled class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-bold text-slate-500"><option value="buy">買入</option><option value="sell">賣出</option></select></div>
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">分類</label><select v-model="editTx.category" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label || cat.name }}</option></select></div>
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">交易身分</label><select v-model="editTx.mode" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"><option value="cash">現股</option><option value="margin">融資</option><option value="short">融券</option></select></div>
                    </div>
                    <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-bolt text-amber-500"></i>
                            <div>
                                <div class="font-black text-slate-800">當沖（同日沖銷）</div>
                                <div class="text-xs text-slate-500 font-bold">勾選後，同日同檔買賣會互相配對；配對成功的賣出部分套用稅率 {{ settings.dayTradeTaxRate }}%</div>
                            </div>
                        </div>
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="editTx.dayTradeEligible" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-amber-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-slate-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                        </label>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">價格</label><input v-model.number="editTx.price" type="number" step="0.01" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"/></div>
                        <div><label class="block text-xs font-bold text-slate-500 mb-1">股數</label><input v-model.number="editTx.qty" type="number" step="1" class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-0 outline-none bg-white font-bold text-slate-700"/></div>
                    </div>
                </div>
                <div class="flex gap-3 mt-8">
                    <button type="button" @click="closeEditTxModal" class="flex-1 px-5 py-3 rounded-xl font-black bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition">取消</button>
                    <button type="button" @click="saveEditedTxFromHistory" class="flex-1 px-5 py-3 rounded-xl font-black bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-400 transition">儲存修改</button>
                </div>
            </div>
        </div>



        <div v-show="currentTab === 'cash'">
            <div class="space-y-6">
                <div class="card">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                        <h2 class="text-xl font-bold text-slate-700 flex items-center"><i class="fa-solid fa-money-bill-transfer text-slate-400 mr-3"></i> 資金流／現金帳</h2>
                        <div class="flex flex-wrap gap-2">
                            <button @click="cashViewMode='all'" class="px-4 py-2 rounded-xl text-sm font-black border transition" :class="cashViewMode==='all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">全部</button>
                            <button @click="cashViewMode='cashOnly'" class="px-4 py-2 rounded-xl text-sm font-black border transition" :class="cashViewMode==='cashOnly' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">只看入出金</button>
                            <button @click="cashViewMode='tradesOnly'" class="px-4 py-2 rounded-xl text-sm font-black border transition" :class="cashViewMode==='tradesOnly' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">只看買賣</button>
                            <button @click="triggerClearCashBook" class="px-4 py-2 rounded-xl text-sm font-black border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition" title="清空目前帳本的期初/入金/出金（不影響交易）"><i class="fa-solid fa-trash-can mr-2"></i>清空入出金</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="flex items-center justify-between"><div class="text-slate-500 text-xs font-bold">總投入（淨入金）</div><i class="fa-solid fa-circle-dollar-to-slot text-slate-400"></i></div>
                            <div class="mt-1 text-xl font-black text-slate-800">{{ formatCurrency(cashNetContribution) }}</div>
                            <div class="mt-1 text-[11px] text-slate-400 font-bold">期初 {{ formatCurrency(cashInitialCapital) }}｜入 {{ formatCurrency(cashDepositsTotal) }}｜出 {{ formatCurrency(cashWithdrawalsTotal) }}</div>
                        </div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="flex items-center justify-between"><div class="text-slate-500 text-xs font-bold">現金餘額</div><i class="fa-solid fa-wallet text-slate-400"></i></div>
                            <div class="mt-1 text-xl font-black" :class="cashBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'">{{ cashBalance >= 0 ? '' : '-' }}{{ formatCurrency(Math.abs(cashBalance)) }}</div>
                            <div class="mt-1 text-[11px] text-slate-400 font-bold">買賣淨額：{{ cashTradeNet >= 0 ? '+' : '' }}{{ formatCurrency(cashTradeNet) }}</div>
                        </div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="flex items-center justify-between"><div class="text-slate-500 text-xs font-bold">持倉市值（估）</div><i class="fa-solid fa-coins text-slate-400"></i></div>
                            <div class="mt-1 text-xl font-black text-slate-800">{{ formatCurrency(estimatedMarketValue) }}</div>
                            <div class="mt-1 text-[11px] text-slate-400 font-bold">未實現：{{ totalUnrealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(totalUnrealizedPnL) }}</div>
                        </div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="flex items-center justify-between"><div class="text-slate-500 text-xs font-bold">總資產（含現金）</div><i class="fa-solid fa-chart-pie text-slate-400"></i></div>
                            <div class="mt-1 text-xl font-black text-slate-800">{{ formatCurrency(netAssetValue) }}</div>
                            <div class="mt-1 text-[11px] font-bold" :class="cashTotalPnL >= 0 ? 'text-up' : 'text-down'">總損益：{{ cashTotalPnL >= 0 ? '+' : '' }}{{ formatCurrency(cashTotalPnL) }}（{{ cashRoiPercent }}%）</div>
                        </div>
                    </div>

                    <div class="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <div class="text-xs font-black text-amber-700 flex items-center gap-2"><i class="fa-solid fa-sack-dollar"></i> 獲利管理</div>
                                <div class="mt-1 text-sm font-bold text-amber-900">已實現 {{ totalRealizedPnL > 0 ? '+' : '' }}{{ formatCurrency(totalRealizedPnL) }} － 提領 {{ formatCurrency(profitWithdrawalsTotal) }} ＋ 補回 {{ formatCurrency(profitRestoresTotal) }}</div>
                            </div>
                            <div class="text-left md:text-right">
                                <div class="text-[11px] font-bold text-amber-700">可用獲利</div>
                                <div class="text-2xl font-black" :class="availableRealizedProfit >= 0 ? 'text-up' : 'text-down'">{{ availableRealizedProfit > 0 ? '+' : '' }}{{ formatCurrency(availableRealizedProfit) }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-5 text-[12px] text-slate-500 font-bold leading-relaxed">
                        <div class="flex items-start gap-2"><i class="fa-solid fa-circle-info text-slate-400 mt-0.5"></i>
                            <div>計算規則：<span class="text-slate-700">總投入</span>＝期初＋入金－出金；<span class="text-slate-700">現金餘額</span>＝總投入＋賣出淨入－買入支出（已含手續費/稅）；<span class="text-slate-700">總資產</span>＝現金餘額＋持倉市值（估）。</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-square-plus text-slate-400"></i> 新增期初 / 入金 / 出金</h3>
                        <div v-if="cashEntryForm.type==='initial' && cashInitialEntry" class="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">將覆蓋既有期初</div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="input-group">
                            <label class="text-xs font-bold text-slate-500 mb-2 ml-1">日期</label>
                            <input type="date" v-model="cashEntryForm.date" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all shadow-sm">
                        </div>
                        <div class="input-group">
                            <label class="text-xs font-bold text-slate-500 mb-2 ml-1">類型</label>
                            <select v-model="cashEntryForm.type" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold outline-none focus:border-emerald-500">
                                <option value="initial">期初資金</option>
                                <option value="deposit">入金</option>
                                <option value="withdraw">出金</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="text-xs font-bold text-slate-500 mb-2 ml-1">金額</label>
                            <div class="relative flex items-center">
                                <input type="number" v-model.number="cashEntryForm.amount" placeholder="0" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all shadow-sm placeholder:text-slate-300">
                                <i class="fa-solid fa-dollar-sign absolute left-4 text-slate-400 text-base pointer-events-none"></i>
                            </div>
                        </div>
                        <div class="input-group">
                            <label class="text-xs font-bold text-slate-500 mb-2 ml-1">備註（選填）</label>
                            <input type="text" v-model="cashEntryForm.note" placeholder="例如：加碼、提領、薪資" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold outline-none focus:border-emerald-500">
                        </div>
                    </div>
                    <button @click="addCashEntry" class="btn btn-success w-full mt-5 gap-2"><i class="fa-solid fa-check"></i> 送出</button>

                    <div v-if="cashTopUpNeeded > 0" class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div class="text-sm font-black text-amber-800 flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation"></i> 目前現金餘額為負，表示你的入金少於買入支出。</div>
                            <button @click="prefillCashTopUp" class="px-4 py-2 rounded-xl font-black text-white bg-amber-600 hover:bg-amber-700 transition flex items-center justify-center gap-2"><i class="fa-solid fa-wand-magic-sparkles"></i> 一鍵補入金 {{ formatCurrency(cashTopUpNeeded) }}</button>
                        </div>
                        <div class="mt-2 text-xs font-bold text-amber-700/80">按下後會自動填入「入金」金額，你只要按送出即可。</div>
                    </div>
                </div>

                <div class="card">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-sack-dollar text-amber-500"></i> 獲利提領 / 補回</h3>
                        <div class="text-xs font-black px-3 py-1.5 rounded-full" :class="availableRealizedProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'">可用獲利 {{ availableRealizedProfit > 0 ? '+' : '' }}{{ formatCurrency(availableRealizedProfit) }}</div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">日期</label><input type="date" v-model="profitAdjustmentForm.date" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50/50 transition-all shadow-sm"></div>
                        <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">類型</label><select v-model="profitAdjustmentForm.type" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold outline-none focus:border-amber-500"><option value="withdraw">提領獲利</option><option value="restore">補回獲利</option></select></div>
                        <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">用途分類</label><select v-model="profitAdjustmentForm.category" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold outline-none focus:border-amber-500"><option value="living">生活費</option><option value="travel">旅遊</option><option value="tax">稅金</option><option value="reinvest">再投入其他資產</option><option value="other">其他</option></select></div>
                        <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">金額</label><div class="relative flex items-center"><input type="number" v-model.number="profitAdjustmentForm.amount" placeholder="0" class="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-lg outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50/50 transition-all shadow-sm placeholder:text-slate-300"><i class="fa-solid fa-dollar-sign absolute left-4 text-slate-400 text-base pointer-events-none"></i></div></div>
                        <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">備註（選填）</label><input type="text" v-model="profitAdjustmentForm.note" placeholder="例如：生活費、旅遊、補回" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold outline-none focus:border-amber-500"></div>
                    </div>
                    <button @click="addProfitAdjustment" class="btn w-full mt-5 gap-2 !bg-amber-500 hover:!bg-amber-600 !text-white shadow-lg shadow-amber-200"><i class="fa-solid fa-check"></i> 新增獲利紀錄</button>
                    <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200" v-if="sortedProfitAdjustments.length > 0">
                        <div class="px-4 py-3 bg-slate-50 text-xs font-black text-slate-500">獲利提領 / 補回紀錄</div>
                        <div class="divide-y divide-slate-100">
                            <div v-for="row in sortedProfitAdjustments" :key="row.id" class="px-4 py-3 flex items-center justify-between gap-3">
                                <div><div class="font-black text-slate-700 text-sm">{{ row.date }}｜{{ row.type === 'withdraw' ? '提領獲利' : '補回獲利' }}｜{{ profitCategoryLabel(row.category) }}</div><div class="text-xs text-slate-400 font-bold">{{ row.note || '-' }}</div></div>
                                <div class="flex items-center gap-3"><div class="font-black" :class="row.type === 'withdraw' ? 'text-rose-600' : 'text-emerald-700'">{{ row.type === 'withdraw' ? '-' : '+' }}{{ formatCurrency(row.amount) }}</div><button @click="deleteProfitAdjustment(row.id)" class="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="刪除"><i class="fa-solid fa-trash-can"></i></button></div>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 text-xs font-bold text-slate-400">＊這不會更動交易產生的已實現損益，只是另外記錄「賺到的錢已領出或補回」。</div>
                </div>

                <div class="card p-0 overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <h3 class="text-base font-extrabold text-slate-700 flex items-center gap-2"><i class="fa-solid fa-receipt text-slate-400"></i> 資金流水帳（含交易）</h3>
                        <div class="text-xs font-bold text-slate-400">顯示：{{ cashViewMode==='all' ? '全部' : (cashViewMode==='cashOnly' ? '入出金' : '買賣') }}</div>
                    </div>

                    <div class="md:hidden divide-y divide-slate-100">
                        <div v-for="row in cashLedgerRowsDisplayed" :key="row.id" class="px-6 py-5">
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-slate-400 flex items-center gap-2"><i class="fa-regular fa-calendar"></i> {{ row.date }}</div>
                                    <div class="mt-2 flex items-center gap-2">
                                        <span class="px-2.5 py-1 rounded-lg text-[11px] font-black" :class="row.kind==='cash' ? (row.subType==='withdraw' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700') : (row.amount >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')">{{ row.kind==='cash' ? row.label : row.txType }}</span>
                                        <div class="font-black text-slate-800 truncate">{{ row.title }}</div>
                                    </div>
                                    <div v-if="row.note" class="mt-1 text-[11px] text-slate-400 font-bold truncate">{{ row.note }}</div>
                                </div>
                                <div class="shrink-0 text-right">
                                    <div class="font-black text-lg" :class="row.amount >= 0 ? 'text-up' : 'text-down'">{{ row.amount >= 0 ? '+' : '-' }}{{ formatCurrency(Math.abs(row.amount)) }}</div>
                                    <div class="text-[10px] font-bold text-slate-400">餘額 {{ formatCurrency(row.balance) }}</div>
                                </div>
                            </div>
                            <div class="flex justify-end mt-3">
                                <button v-if="row.canDelete" @click="deleteCashEntry(row.rawId)" class="px-3 py-2 rounded-lg text-xs font-black bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition"><i class="fa-solid fa-trash-can mr-1"></i> 刪除</button>
                            </div>
                        </div>
                        <div v-if="cashLedgerRowsDisplayed.length === 0" class="text-center py-12 text-slate-400 font-bold">此模式無資料</div>
                    </div>

                    <div class="hidden md:block overflow-x-auto">
                        <table class="w-full text-left text-sm min-w-[920px]">
                            <thead>
                                <tr class="bg-slate-100 text-slate-500 border-b border-slate-200">
                                    <th class="p-5 pl-8 whitespace-nowrap font-bold">日期</th>
                                    <th class="p-5 whitespace-nowrap font-bold">類別</th>
                                    <th class="p-5 whitespace-nowrap font-bold">摘要</th>
                                    <th class="p-5 text-right whitespace-nowrap font-bold">入金</th>
                                    <th class="p-5 text-right whitespace-nowrap font-bold">出金</th>
                                    <th class="p-5 text-right whitespace-nowrap font-bold">餘額</th>
                                    <th class="p-5 text-center whitespace-nowrap font-bold">操作</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="row in cashLedgerRowsDisplayed" :key="row.id" class="hover:bg-slate-50 transition bg-white">
                                    <td class="p-5 pl-8 text-slate-600 font-bold whitespace-nowrap">{{ row.date }}</td>
                                    <td class="p-5 whitespace-nowrap"><span class="px-3 py-1.5 rounded-lg text-xs font-black" :class="row.kind==='cash' ? (row.subType==='withdraw' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700') : (row.amount >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')">{{ row.kind==='cash' ? row.label : row.txType }}</span></td>
                                    <td class="p-5"><div class="font-black text-slate-800">{{ row.title }}</div><div v-if="row.note" class="text-xs text-slate-400 font-bold mt-1">{{ row.note }}</div></td>
                                    <td class="p-5 text-right font-black text-emerald-700">{{ row.inAmount > 0 ? formatCurrency(row.inAmount) : '-' }}</td>
                                    <td class="p-5 text-right font-black text-rose-600">{{ row.outAmount > 0 ? formatCurrency(row.outAmount) : '-' }}</td>
                                    <td class="p-5 text-right font-black text-slate-800">{{ formatCurrency(row.balance) }}</td>
                                    <td class="p-5 text-center">
                                        <button v-if="row.canDelete" @click="deleteCashEntry(row.rawId)" class="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="刪除"><i class="fa-solid fa-trash-can"></i></button>
                                        <span v-else class="text-slate-200">—</span>
                                    </td>
                                </tr>
                                <tr v-if="cashLedgerRowsDisplayed.length === 0"><td colspan="7" class="p-12 text-center text-slate-400 font-bold">此模式無資料</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showConfirmModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[100] p-6 transition-all duration-300"><div class="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl transform scale-100 flex flex-col items-center text-center relative border-2 border-red-50"><div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-4xl mb-5 shadow-inner"><i class="fa-solid fa-triangle-exclamation"></i></div><h3 class="text-2xl font-black text-slate-800 mb-3">{{ confirmTitle }}</h3><p class="text-slate-500 font-bold mb-8 leading-relaxed">{{ confirmMessage }}</p><div class="flex gap-4 w-full"><button @click="showConfirmModal = false" class="h-[54px] flex-1 rounded-xl font-bold text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 active:scale-95">取消</button><button @click="confirmAction" class="h-[54px] flex-1 rounded-xl font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-xl shadow-rose-300 hover:shadow-2xl hover:shadow-rose-400 hover:-translate-y-1 transition-all duration-300 active:scale-95">確認執行</button></div></div></div>

        <div v-if="showCashShortModal" @click.self="cancelCashShortBuy" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[120] p-6 transition-all duration-300">
            <div class="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-amber-100 relative">
                <div class="p-7 bg-gradient-to-r from-amber-50 via-white to-yellow-50 border-b border-slate-100">
                    <div class="flex items-start gap-4">
                        <div class="relative shrink-0">
                            <div class="absolute -inset-1 rounded-2xl bg-amber-400/25 blur-lg"></div>
                            <div class="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-amber-300/50">
                                <i class="fa-solid fa-coins"></i>
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="text-xl font-black text-slate-900">現金不足，需要補入金</div>
                            <div class="text-sm text-slate-500 font-bold mt-1">
                                買入 <span class="text-slate-800">{{ cashShortTarget }}</span> 前，需先補足現金餘額。
                            </div>
                        </div>
                        <button @click="cancelCashShortBuy" class="w-10 h-10 rounded-full bg-white/70 hover:bg-white border border-slate-200 text-slate-500 flex items-center justify-center active:scale-95 transition">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <div class="p-7 space-y-5">
                    <div class="grid grid-cols-3 gap-3 text-sm">
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="text-xs text-slate-400 font-extrabold">目前現金</div>
                            <div class="mt-1 font-black text-slate-800">{{ formatCurrency(cashShortCurrentCash) }}</div>
                        </div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                            <div class="text-xs text-slate-400 font-extrabold">本次支出</div>
                            <div class="mt-1 font-black text-slate-800">{{ formatCurrency(cashShortBuyCost) }}</div>
                        </div>
                        <div class="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                            <div class="text-xs text-amber-700 font-extrabold">需補入金</div>
                            <div class="mt-1 font-black text-amber-800">{{ formatCurrency(cashShortNeeded) }}</div>
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                        <div class="text-xs font-extrabold text-slate-600 mb-2">入金金額</div>
                        <div class="relative">
                            <i class="fa-solid fa-arrow-trend-up absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"></i>
                            <input type="number" v-model.number="cashShortForm.amount" class="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 font-black text-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition" />
                        </div>
                        <div class="mt-2 text-[11px] font-bold" :class="canProceedCashTopUp ? 'text-slate-500' : 'text-rose-600'">
                            <span v-if="canProceedCashTopUp">＊會新增一筆「入金」到資金流，日期使用交易日期（{{ cashShortTradeDate }}）。</span>
                            <span v-else>＊入金不足：至少需要 {{ formatCurrency(cashShortNeeded) }} 才能完成買入。</span>
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                        <div class="text-xs font-extrabold text-slate-600 mb-2">備註（可留空）</div>
                        <input type="text" v-model="cashShortForm.note" placeholder="例如：加碼投入/轉帳入金…" class="w-full h-12 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition" />
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button @click="cancelCashShortBuy" class="h-12 flex-1 rounded-xl font-black bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition">取消買入</button>
                        <button @click="confirmTopUpAndProceed" :disabled="!canProceedCashTopUp" class="h-12 flex-1 rounded-xl font-black text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-300/40 hover:shadow-xl hover:shadow-emerald-300/60 hover:-translate-y-0.5 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                            <i class="fa-solid fa-check mr-2"></i>補入金並買入
                        </button>
                    </div>
                </div>
            </div>
        </div>


        <div v-if="showInfoModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[100] p-6 transition-all duration-300"><div class="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl transform scale-100 flex flex-col items-center text-center"><div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl mb-4 shadow-sm"><i class="fa-solid fa-circle-info"></i></div><h3 class="text-xl font-black text-slate-800 mb-2">{{ infoTitle }}</h3><p class="text-slate-500 font-bold mb-6 whitespace-pre-line">{{ infoMessage }}</p><button @click="showInfoModal = false" class="h-[54px] w-full rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-xl shadow-blue-300 hover:shadow-2xl hover:shadow-blue-400 hover:-translate-y-1 transition-all duration-300 active:scale-95">好，我知道了</button></div></div>
        
        <div v-if="showGDriveModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[85] p-4">
            <div class="bg-white w-full max-w-xl rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden relative flex flex-col max-h-[calc(100dvh-2rem)]">
                <div class="p-6 md:p-8 border-b border-slate-100 shrink-0 sticky top-0 bg-white z-10"><div class="flex items-start justify-between gap-4"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><i class="fa-solid fa-cloud text-xl"></i></div><div><div class="text-xl font-extrabold text-slate-900">Google 雲端備份</div><div class="text-sm text-slate-500 mt-1">將資料備份到 Google Drive（AppDataFolder）或從雲端回復。</div></div></div><button @click="showGDriveModal = false" class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95"><i class="fa-solid fa-xmark"></i></button></div></div>
                <div class="flex-1 overflow-y-auto"><div class="p-4 md:p-8 space-y-6 pb-32"><div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div class="flex items-start justify-between gap-3 mb-3"><div><div class="text-sm font-bold text-slate-700">Google OAuth Client ID（Web）</div><div class="text-xs font-bold text-slate-500 mt-1">一般使用者可直接使用網站預設 Client ID；只有想改用自己的 Google Cloud 專案時才需要自訂。</div></div><div class="shrink-0 rounded-full px-3 py-1 text-xs font-black" :class="gdriveClientIdSource === 'none' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">{{ gdriveClientIdStatusText }}</div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4"><div class="rounded-xl bg-white border border-slate-200 p-3"><div class="text-xs font-bold text-slate-400">網站預設 Client ID</div><div class="mt-1 text-sm font-black text-slate-700">{{ gdriveDefaultClientId ? '已內建，可直接使用' : '尚未內建' }}</div></div><div class="rounded-xl bg-white border border-slate-200 p-3"><div class="text-xs font-bold text-slate-400">目前實際使用</div><div class="mt-1 text-sm font-black text-slate-700">{{ gdriveClientIdStatusText }}</div></div></div><input v-model="gdriveClientIdInput" type="text" placeholder="進階選填：輸入自己的 Client ID..." class="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-400" /><div class="flex flex-wrap gap-3 mt-3"><button @click="saveGDriveClientId" :disabled="gdriveBusy" class="h-11 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">儲存自訂 Client ID</button><button @click="clearGDriveClientId" :disabled="gdriveBusy" class="h-11 px-4 rounded-xl font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">清除自訂</button><div class="text-xs text-slate-500 flex items-center">自訂：<span class="ml-1 font-mono text-slate-600">{{ gdriveClientId ? '已設定' : '未設定' }}</span></div></div><div v-if="!gdriveDefaultClientId && !gdriveClientId" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">提醒：目前尚未在 index.html 內放入網站預設 Client ID，因此仍需先輸入自訂 Client ID 才能使用 Google 備份。</div></div><div class="rounded-2xl border border-slate-200 bg-white p-4"><div class="flex items-center justify-between gap-3"><div class="text-sm font-extrabold text-slate-700">備份狀態</div><button @click="refreshGDriveCloudMeta" :disabled="gdriveBusy" class="h-9 px-3 rounded-xl text-xs font-extrabold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"><i class="fa-solid fa-rotate" :class="{'fa-spin': gdriveBusy}"></i> 刷新雲端狀態</button></div><div class="mt-3 rounded-2xl border p-4 flex items-center gap-3" :class="cloudBackupStatusClass"><div class="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center shrink-0"><i :class="cloudBackupStatusIcon"></i></div><div class="min-w-0"><div class="text-sm font-black truncate">{{ cloudBackupStatusText }}</div><div class="text-xs font-bold opacity-80 truncate">{{ cloudBackupStatusSubtext }}</div><div v-if="gdriveCloudMeta && gdriveCloudMeta.lastCloudErrorMessage" class="mt-1 text-xs font-bold opacity-80 truncate">{{ gdriveCloudMeta.lastCloudErrorMessage }}</div></div></div><div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="font-bold text-slate-500">雲端檔案最後修改</div><div class="mt-1 font-extrabold text-slate-800">{{ formatDateTime(gdriveCloudMeta.cloudFileModifiedTime) }}</div></div><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="font-bold text-slate-500">最後操作來源</div><div class="mt-1 font-extrabold text-slate-800">{{ gdriveLastActionLabel }}</div></div><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="font-bold text-slate-500">最後雲端上傳</div><div class="mt-1 font-extrabold text-slate-800">{{ formatDateTime(gdriveCloudMeta.lastCloudUploadAt) }}</div></div><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="font-bold text-slate-500">最後雲端回復</div><div class="mt-1 font-extrabold text-slate-800">{{ formatDateTime(gdriveCloudMeta.lastCloudRestoreAt) }}</div></div><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="font-bold text-slate-500">最新備份來源</div><div class="mt-1 font-extrabold text-slate-800">{{ gdriveCloudMeta.cloudBackupDeviceName || '—' }}</div></div><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="font-bold text-slate-500">備份內容</div><div class="mt-1 font-extrabold text-slate-800">交易 {{ gdriveCloudMeta.cloudBackupTxCount || 0 }} 筆 / 資金 {{ gdriveCloudMeta.cloudBackupCashBookCount || 0 }} 筆</div></div><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="font-bold text-slate-500">同名備份檔</div><div class="mt-1 font-extrabold text-slate-800">{{ gdriveCloudMeta.cloudDuplicateCount ? gdriveCloudMeta.cloudDuplicateCount + ' 個' : '—' }}</div></div></div></div></div></div><div class="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-100 shrink-0"><div class="p-4 md:px-8 md:py-6 space-y-3"><div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><button @click="uploadToGDrive" :disabled="gdriveBusy" class="h-14 rounded-2xl font-extrabold text-white bg-emerald-500 shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"><i class="fa-solid fa-cloud-arrow-up"></i> 上傳資料到雲端</button><button @click="restoreFromGDrive" :disabled="gdriveBusy" class="h-14 rounded-2xl font-extrabold text-white bg-indigo-500 shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"><i class="fa-solid fa-cloud-arrow-down"></i> 從雲端回復資料</button><button @click="triggerDeleteGDriveBackup" :disabled="gdriveBusy" class="h-14 rounded-2xl font-extrabold text-white bg-rose-500 shadow-lg shadow-rose-500/25 hover:bg-rose-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"><i class="fa-solid fa-trash-can"></i> 移除雲端備份</button></div><button @click="showGDriveModal = false" :disabled="gdriveBusy" class="w-full h-12 rounded-2xl font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">關閉</button></div></div>
                <div v-if="gdriveBusy" class="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center"><div class="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-lg border border-slate-200"><i class="fa-solid fa-spinner fa-spin text-slate-600"></i><div class="text-sm font-bold text-slate-700">{{ gdriveBusyText || '處理中…' }}</div></div></div>
            </div>
        </div>

        
        <div v-if="showCommodityModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[80] p-4 transition-all duration-300" @click.self="showCommodityModal = false">
            <div class="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 class="text-2xl font-extrabold text-slate-800 flex items-center">
                        <i class="fa-solid fa-coins text-amber-500 mr-3"></i> 即時商品期貨查價
                    </h3>
                    <button @click="showCommodityModal = false" class="w-9 h-9 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition" aria-label="關閉">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="overflow-y-auto p-6 space-y-5">
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed">
                        <div class="font-extrabold text-slate-700 mb-1">快速查價（即時指標／差價合約）</div>
                        這裡提供黃金、白銀、銅、布蘭特原油的即時報價小工具（TradingView）。台指期貨法人未平倉與個股籌碼／注意處置查詢已移到「庫存管理」頁的「市場觀察」按鈕內。若畫面顯示空白，請確認瀏覽器未封鎖第三方小工具後再試。
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="font-extrabold text-slate-700 flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> 黃金（期貨指標）
                                </div>
                                <a href="https://www.tradingview.com/symbols/GOLD/?exchange=TVC" target="_blank" rel="noopener" class="text-xs font-bold text-blue-600 hover:underline">開啟圖表</a>
                            </div>
                            <div id="tv_quote_gc1" class="rounded-xl border border-slate-200 bg-white/70 p-3 min-h-[86px]"></div>
                            <div class="pt-2 text-xs text-slate-400">Quotes by TradingView</div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="font-extrabold text-slate-700 flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span> 白銀（期貨指標）
                                </div>
                                <a href="https://www.tradingview.com/symbols/SILVER/?exchange=TVC" target="_blank" rel="noopener" class="text-xs font-bold text-blue-600 hover:underline">開啟圖表</a>
                            </div>
                            <div id="tv_quote_si1" class="rounded-xl border border-slate-200 bg-white/70 p-3 min-h-[86px]"></div>
                            <div class="pt-2 text-xs text-slate-400">Quotes by TradingView</div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="font-extrabold text-slate-700 flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-orange-400"></span> 銅（期貨指標）
                                </div>
                                <a href="https://www.tradingview.com/symbols/COPPER/?exchange=CAPITALCOM" target="_blank" rel="noopener" class="text-xs font-bold text-blue-600 hover:underline">開啟圖表</a>
                            </div>
                            <div id="tv_quote_hg1" class="rounded-xl border border-slate-200 bg-white/70 p-3 min-h-[86px]"></div>
                            <div class="pt-2 text-xs text-slate-400">Quotes by TradingView</div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="font-extrabold text-slate-700 flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 布蘭特原油（期貨指標）
                                </div>
                                <a href="https://www.tradingview.com/symbols/UKOIL/?exchange=TVC" target="_blank" rel="noopener" class="text-xs font-bold text-blue-600 hover:underline">開啟圖表</a>
                            </div>
                            <div id="tv_quote_brn1" class="rounded-xl border border-slate-200 bg-white/70 p-3 min-h-[86px]"></div>
                            <div class="pt-2 text-xs text-slate-400">Quotes by TradingView</div>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2 justify-end">
                        <button @click="refreshCommodityWidgets" class="btn btn-secondary !rounded-xl !h-11 !px-4"><i class="fa-solid fa-rotate-right mr-2"></i>重新載入</button>
                        <button @click="showCommodityModal = false" class="btn btn-primary !rounded-xl !h-11 !px-4"><i class="fa-solid fa-check mr-2"></i>完成</button>
                    </div>
                </div>
            </div>
        </div>

<div v-if="showHelpModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[80] p-4 transition-all duration-300">
             <div class="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl relative flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center p-6 border-b border-slate-100"><h3 class="text-2xl font-extrabold text-slate-800 flex items-center"><i class="fa-solid fa-book-open text-blue-500 mr-3"></i> 系統使用說明</h3><button @click="showHelpModal = false" class="w-9 h-9 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition"><i class="fa-solid fa-times"></i></button></div>
                <div class="overflow-y-auto p-6 space-y-8">
    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3 flex items-center">快速入門</h4>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <p><strong>1) 先選擇帳本：</strong>右上角帳本按鈕（手機為頂欄帳本名稱）進入「投資帳本」可新增/切換帳本。每個帳本的交易、庫存、歷史帳務與資金流<strong>完全獨立</strong>。</p>
<p><strong>2) 設定費率：</strong>右上角 <i class="fa-solid fa-gear mx-1"></i>「費率設定」填入你的券商手續費、折扣、最低手續費、證交稅；若有當沖，請設定「當沖證交稅率」。</p>
<p><strong>3) 設定資金流（建議先做）：</strong>到「資金流」新增<strong>期初資金</strong>（一開始帶多少錢進來投資），之後加碼用「入金」、提領用「出金」。</p>
<p><strong>4) 新增交易：</strong>在「庫存管理」頁新增買入/賣出，或使用「融券賣出 / 回補」記錄做空。<strong>買入若現金不足</strong>，系統會自動跳出「補入金」視窗協助補足後再買入。</p>
<p><strong>5) 策略分類：</strong>在「策略分類」下拉選擇，或直接在下方輸入新名稱並按「新增」建立自己的分類（例如：長期、短線、定期定額、孩子A…）。</p>
<p><strong>6) 更新股價與股名：</strong>按「更新股價」抓取 Yahoo 最新價格；同時會嘗試同步抓取<strong>中文股名</strong>（含 ETF），用於庫存/歷史帳務顯示。</p>
<p><strong>7) 備份：</strong>右上角 <i class="fa-solid fa-download mx-1"></i> 下載備份檔，或用 <i class="fa-solid fa-cloud mx-1"></i> Google 雲端備份（可使用網站預設 OAuth Client ID，進階使用者可自訂）。備份包含：交易、費率、帳本、分類、股名對照、資金流等。</p>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">投資帳本（多帳本管理）</h4>
        <div class="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <ul class="list-disc pl-5 space-y-1">
                <li><strong>用途：</strong>把不同目的/成員的投資分開管理（例如：我的帳戶、家庭帳本、孩子A、孩子B、長期帳…）。</li>
                <li><strong>切換：</strong>切換帳本後，「庫存」與「歷史帳務」會自動切到該帳本的資料。</li>
                <li><strong>改名：</strong>在投資帳本清單可直接修改名稱。</li>
                <li><strong>刪除：</strong>刪除帳本會<strong>一併刪除該帳本的所有交易</strong>（請先備份）。</li>
            </ul>
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div class="font-extrabold text-slate-700 mb-1">提醒</div>
                <div>新增交易會記錄在<strong>目前帳本</strong>。如果覺得資料「不見了」，通常是帳本切到別的了。</div>
            </div>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">策略分類（可自訂）</h4>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <ul class="list-disc pl-5 space-y-1">
                <li><strong>新增：</strong>在「新增交易紀錄」的策略分類下方輸入名稱並按「新增」。</li>
                <li><strong>篩選：</strong>持倉上方會顯示分類篩選列（只顯示目前帳本中「有庫存」的分類）。</li>
                <li><strong>編輯：</strong>在「編輯買入/交易」可調整分類；修改後系統會重新計算並更新持倉。</li>
                <li><strong>備份：</strong>分類會跟著「下載備份」與「Google 雲端備份」一起保存與還原。</li>
            </ul>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">交易類型與計算規則</h4>
        <div class="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <div class="grid sm:grid-cols-2 gap-3">
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div class="font-extrabold text-slate-700 mb-1">買入（做多）</div>
                    <div>建立/加碼多單。<br>成本 = 價格×股數 + 手續費</div>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div class="font-extrabold text-slate-700 mb-1">賣出（平多/減碼）</div>
                    <div>減碼或出清多單。<br>入帳 = 價格×股數 − 手續費 − 證交稅</div>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div class="font-extrabold text-slate-700 mb-1">融券賣出（做空）</div>
                    <div>先賣出建立空單，允許在沒有庫存時賣出。<br>空單持倉會顯示「股數為負」。</div>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div class="font-extrabold text-slate-700 mb-1">回補（平空）</div>
                    <div>買回減少/結束空單。<br>若回補股數超過空單，超出部分會轉為多單。</div>
                </div>
            </div>
            <div class="pt-2">
                <div class="font-extrabold text-slate-700 mb-1">損益算法</div>
                <ul class="list-disc pl-5 space-y-1">
                    <li>系統採<strong>平均成本法</strong>（同一股票以加權平均成本計算已實現損益）。</li>
                    <li><strong>已實現損益</strong>：每筆平倉（賣出平多 / 回補平空）當下就計入。</li>
                    <li><strong>未實現損益</strong>：以最新股價估算，多單/空單都會計算（空單價格下跌為正）。</li>
                    <li>手續費依「費率 × 折扣」計算並套用最低手續費；證交稅在「賣出」端計入（含融券賣出）。</li>
                    <li>每次新增/編輯/刪除交易後，系統會依時間順序<strong>重新計算</strong>持倉與損益，確保一致性。</li>
                </ul>
            </div>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">資金流／現金帳（入金 / 出金 / 期初）</h4>
    <div class="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
        <p><strong>用途：</strong>用「薪資帳本」邏輯管理你的投資資金來源與流向，並同時追蹤<strong>現金餘額</strong>、<strong>總投入（淨入金）</strong>、<strong>總資產</strong>與<strong>總損益</strong>。</p>

        <div class="grid sm:grid-cols-2 gap-3">
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div class="font-extrabold text-slate-700 mb-1">期初資金</div>
                <div>你一開始帶多少錢進來投資。<br>同一帳本會保留<strong>最新一筆期初</strong>（新的會覆蓋舊的）。</div>
            </div>
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div class="font-extrabold text-slate-700 mb-1">入金 / 出金</div>
                <div>入金：加碼投入；出金：提領獲利/抽回本金。<br><strong>出金會降低總投入</strong>（淨入金）。</div>
            </div>
        </div>

        <div class="pt-1">
            <div class="font-extrabold text-slate-700 mb-1">核心指標（計算概念）</div>
            <ul class="list-disc pl-5 space-y-1">
                <li><strong>總投入（淨入金）</strong> = 期初 + 入金 − 出金</li>
                <li><strong>現金餘額</strong> = 總投入 +（賣出淨入 − 買入支出）</li>
                <li><strong>總資產（含現金）</strong> = 現金餘額 + 持倉市值（估）</li>
                <li><strong>總損益</strong> = 總資產 − 總投入（並顯示 ROI%）</li>
            </ul>
            <div class="text-xs text-slate-500 mt-2">註：買入支出包含手續費；賣出淨入會扣除手續費與證交稅。</div>
        </div>

        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div class="font-extrabold text-slate-700 mb-1">進階：買入現金不足自動補入金</div>
            <div>當你在「買入」且選擇<strong>現股（Cash）</strong>時，若現金餘額不足以支付本次買入（含手續費），系統會自動跳出<strong>美化確認視窗</strong>，顯示「目前現金 / 本次支出 / 需補入金」。你可直接按「補入金並買入」一鍵完成，或調整入金金額與備註。</div>
        </div>

        <div class="text-xs text-slate-500">提醒：資金流為<strong>帳本級</strong>資料；切換帳本會看到該帳本自己的期初/入金/出金與現金餘額。</div>
    </div>
</div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">當沖（Day Trade）與稅率</h4>
        <div class="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <p><strong>目的：</strong>當沖在台股通常適用不同的證交稅率。系統會依你是否勾選「參與當沖配對」決定是否嘗試同日配對與使用當沖稅率。</p>
            <ul class="list-disc pl-5 space-y-1">
                <li>到「費率設定」填入<strong>當沖證交稅率 (%)</strong>（預設 0.15）。</li>
                <li>在「賣出」視窗開啟<strong>參與當沖配對</strong>：系統會嘗試將同日買/賣（含先賣後買）進行配對。</li>
                <li><strong>配對成功</strong>的賣出部分會使用當沖稅率；其餘部分使用一般證交稅率。</li>
                <li>如果你沒有做當沖，保持不開啟即可。</li>
            </ul>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">更新股價、警示/處置、中文股名</h4>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <ul class="list-disc pl-5 space-y-1">
                <li><strong>更新股價：</strong>透過 Yahoo Finance 抓最新價格並快取；抓不到時會沿用上次成功價格。</li>
                <li><strong>中文股名：</strong>更新股價時會嘗試同步抓取中文名稱（含 ETF），之後庫存/歷史/編輯都會優先顯示中文。</li>
                <li><strong>處置/注意：</strong>系統會嘗試從 Yahoo 頁面判斷是否為處置/注意標的（此功能可能受 Yahoo 版面調整影響）。</li>
                <li><strong>全球指數（夜）：</strong>提供美股與夜盤參考（資料來源依網路狀況可能延遲）。</li>
            </ul>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">歷史帳務：列表與分析</h4>
        <div class="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <ul class="list-disc pl-5 space-y-1">
                <li><strong>列表：</strong>可依日期、類型篩選，並支援刪除、編輯交易。</li>
                <li><strong>分析：</strong>依股票彙總已實現損益、報酬率、交易筆數等，便於回顧策略表現。</li>
            </ul>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">備份、還原與資料安全</h4>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
            <ul class="list-disc pl-5 space-y-1">
                <li><strong>本機資料：</strong>所有資料預設存於瀏覽器 localStorage。清除瀏覽器資料/更換裝置會造成資料消失，請定期備份。</li>
                <li><strong>下載備份：</strong>匯出 JSON 檔；匯入還原會以備份檔覆蓋目前資料。</li>
                <li><strong>Google 雲端備份：</strong>備份檔會存到 Google Drive <code>appDataFolder</code>（一般檔案列表看不到）。</li>
                <li><strong>備份內容：</strong>交易、費率、股票清單、自訂中文股名對照、帳本、策略分類、資金流（期初/入金/出金）、快取狀態等。</li>
            </ul>
        </div>
    </div>

    <div>
        <h4 class="text-lg font-black text-slate-700 mb-3">常見問題</h4>
        <div class="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-4 leading-relaxed">
            <div>
                <div class="font-extrabold text-slate-700 mb-1">Q1：股價更新失敗？</div>
                <div>A：可能是網路或資料來源暫時異常。你仍可繼續記帳；未實現損益會使用上次成功抓到的價格。稍後再按一次更新即可。</div>
            </div>
            <div>
                <div class="font-extrabold text-slate-700 mb-1">Q2：為什麼資料看起來「不見了」？</div>
                <div>A：請先確認你目前切換到哪個「投資帳本」。每個帳本資料獨立；切回正確帳本就會看到。</div>
            </div>
            <div>
                <div class="font-extrabold text-slate-700 mb-1">Q3：Google 雲端備份看不到檔案？</div>
                <div>A：備份會存到 <code>appDataFolder</code>，在一般 Drive 檔案列表是看不到的。請用系統內的「刷新雲端狀態」確認是否存在。</div>
            </div>
            <div>
                <div class="font-extrabold text-slate-700 mb-1">Q4：為什麼股名不是中文？</div>
                <div>A：先按一次「更新股價」，系統會嘗試同步抓中文股名；抓到後會記住並用於庫存/歷史/編輯顯示。</div>
            </div>
<div>
    <div class="font-extrabold text-slate-700 mb-1">Q5：買入時跳出「補入金」視窗是什麼？</div>
    <div>A：代表你目前帳本的「現金餘額」不足以支付這筆買入（含手續費）。視窗會顯示需補金額，你可按「補入金並買入」一鍵完成，或取消回去調整交易。</div>
</div>
<div>
    <div class="font-extrabold text-slate-700 mb-1">Q6：現金餘額為負數怎麼辦？</div>
    <div>A：通常是你先記了買入但尚未入金，或曾經出金/提領導致不足。到「資金流」新增入金，或用系統提示的「一鍵補入金」把現金補到非負即可。</div>
</div>
        </div>
    </div>
</div>
                <div class="p-6 border-t border-slate-100"><button @click="showHelpModal = false" class="w-full h-[50px] bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">了解，開始使用</button></div>
             </div>
        </div>

        <div v-if="showSettings" class="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex justify-center items-start z-50 p-3 sm:p-4 overflow-y-auto">
            <div class="modal-scroll bg-white/95 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-7 w-full max-w-lg max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-32px)] overflow-y-auto shadow-[0_35px_100px_-35px_rgba(15,23,42,0.55)] border border-white/80 relative my-0">
                <button @click="showSettings = false" class="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center active:bg-slate-200 transition-colors"><i class="fa-solid fa-times"></i></button>
                <div class="pr-12">
                    <div class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 border border-blue-100">
                        <i class="fa-solid fa-sliders"></i>
                        Brokerage Settings
                    </div>
                    <h3 class="mt-3 text-2xl font-extrabold text-slate-800 tracking-tight">費率設定</h3>
                    <p class="mt-1 text-sm text-slate-500">已整理成較好操作的 App 版型，可直接套用康和證券預設或自行微調。</p>
                </div>

                <div class="mt-6 rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-5 shadow-[0_18px_40px_-28px_rgba(5,150,105,0.45)]">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                                <i class="fa-solid fa-shield-halved"></i>
                                康和證券預設
                            </div>
                            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:text-sm">
                                <div class="rounded-xl bg-white/80 px-3 py-2 border border-emerald-100">手續費率 <span class="font-bold text-slate-800">0.1425%</span></div>
                                <div class="rounded-xl bg-white/80 px-3 py-2 border border-emerald-100">折扣 <span class="font-bold text-slate-800">1 倍</span></div>
                                <div class="rounded-xl bg-white/80 px-3 py-2 border border-emerald-100">最低手續費 <span class="font-bold text-slate-800">20 元</span></div>
                                <div class="rounded-xl bg-white/80 px-3 py-2 border border-emerald-100">當沖稅 <span class="font-bold text-slate-800">0.15%</span></div>
                            </div>
                        </div>
                    </div>
                    <button @click="applyKangHePreset" class="mt-4 w-full h-12 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all hover:bg-emerald-700">套用康和證券預設</button>
                </div>

                <div class="mt-6 rounded-[1.75rem] border border-slate-200 bg-white/80 p-5 sm:p-6 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
                    <div class="flex items-center justify-between gap-3">
                        <label class="text-sm font-extrabold text-slate-700">手續費折扣</label>
                        <span class="text-xs font-bold text-slate-500">目前：{{ settings.discount }} 倍</span>
                    </div>
                    <div class="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <button type="button" @click="settings.discount = 1" class="h-11 rounded-xl border text-sm font-bold transition-all"
                            :class="settings.discount === 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'">康和預設</button>
                        <button type="button" @click="settings.discount = 0.28" class="h-11 rounded-xl border text-sm font-bold transition-all"
                            :class="settings.discount === 0.28 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'">2.8 折</button>
                        <button type="button" @click="settings.discount = 0.3" class="h-11 rounded-xl border text-sm font-bold transition-all"
                            :class="settings.discount === 0.3 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'">3 折</button>
                        <button type="button" @click="settings.discount = 0.5" class="h-11 rounded-xl border text-sm font-bold transition-all"
                            :class="settings.discount === 0.5 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'">5 折</button>
                        <button type="button" @click="settings.discount = 0.6" class="h-11 rounded-xl border text-sm font-bold transition-all"
                            :class="settings.discount === 0.6 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'">6 折</button>
                    </div>
                    <div class="mt-3">
                        <label class="mb-2 block text-xs font-bold text-slate-500">自訂折扣倍數</label>
                        <input type="number" step="0.01" v-model.number="settings.discount" class="w-full h-12 px-4 bg-white border border-slate-300 rounded-2xl text-slate-700 font-bold text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm" placeholder="例如 1、0.6、0.3">
                    </div>
                </div>

                <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="sm:col-span-2 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                        <div class="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center"><i class="fa-solid fa-calculator"></i></div>
                        細部費率欄位
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                        <label class="block text-xs font-bold text-slate-500 mb-2">手續費率 (%)</label>
                        <input type="number" step="0.0001" v-model.number="settings.feeRate" class="w-full h-12 px-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-700 font-bold text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all">
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                        <label class="block text-xs font-bold text-slate-500 mb-2">最低手續費 (元)</label>
                        <input type="number" v-model.number="settings.minFee" class="w-full h-12 px-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-700 font-bold text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all">
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                        <label class="block text-xs font-bold text-slate-500 mb-2">證交稅率 (%)</label>
                        <input type="number" step="0.0001" v-model.number="settings.taxRate" class="w-full h-12 px-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-700 font-bold text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all">
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                        <label class="block text-xs font-bold text-slate-500 mb-2">當沖證交稅率 (%)</label>
                        <input type="number" step="0.0001" v-model.number="settings.dayTradeTaxRate" class="w-full h-12 px-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-700 font-bold text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all">
                    </div>
                </div>

                <div class="mt-6 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 leading-6">
                    提醒：康和證券預設已依你提供的明細校正。若之後券商折扣或稅率變動，可在這裡直接修改。
                </div>

                <div class="mt-7 sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-4 pb-1">
                    <button @click="saveSettings" class="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-[0_18px_35px_-18px_rgba(37,99,235,0.55)] active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-800">
                        <i class="fa-solid fa-floppy-disk"></i>
                        儲存設定
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showSecurityModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div class="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative">
                <button @click="showSecurityModal = false" class="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center active:bg-slate-200 transition-colors"><i class="fa-solid fa-times"></i></button>
                <h3 class="text-xl font-extrabold mb-8 text-slate-800 flex items-center tracking-tight">安全性設定</h3>
                <div class="space-y-4">
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div><div class="font-bold text-slate-700">啟用登入保護</div><div class="text-xs text-slate-400 font-bold mt-1">開啟時，進入網頁需輸入密碼</div></div>
                        <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in"><input type="checkbox" name="toggle" id="toggle-protection" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200" :class="securityConfig.enabled ? 'right-0 border-blue-500' : 'left-0 border-slate-300'" v-model="securityConfig.enabled" @change="updateSecurityConfig"/><label for="toggle-protection" class="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer" :class="securityConfig.enabled ? 'bg-blue-500' : 'bg-slate-300'"></label></div>
                    </div>
                    <button @click="showChangePasswordModal = true; showSecurityModal = false" class="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-between hover:bg-slate-50 active:scale-98 transition"><span class="flex items-center gap-3"><i class="fa-solid fa-key text-slate-400"></i> 變更密碼</span><i class="fa-solid fa-chevron-right text-slate-300 text-sm"></i></button>
                    <button @click="startFloatingPositionEditFromSecurity" class="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-between hover:bg-slate-50 active:scale-98 transition"><span class="flex items-center gap-3"><i class="fa-solid fa-up-down-left-right text-slate-400"></i> 手動變更位置</span><span class="text-xs text-slate-400 font-bold">更新股價</span></button>
                    <button @click="logout" class="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-between hover:bg-slate-50 active:scale-98 transition"><span class="flex items-center gap-3"><i class="fa-solid fa-arrow-right-from-bracket text-slate-400"></i> 登出並鎖定</span><i class="fa-solid fa-chevron-right text-slate-300 text-sm"></i></button>
                    <hr class="border-slate-100 my-2">
                    <button @click="triggerClearAuth" class="w-full p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 font-bold flex items-center justify-center hover:bg-red-100 active:scale-98 transition"><i class="fa-solid fa-user-xmark mr-2"></i> 清除已儲存密碼</button>
                </div>
            </div>
        </div>

        <div v-if="showChangePasswordModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
             <div class="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative">
                <button @click="showChangePasswordModal = false; showSecurityModal = true" class="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center active:bg-slate-200 transition-colors"><i class="fa-solid fa-times"></i></button>
                <h3 class="text-xl font-extrabold mb-6 text-slate-800">變更密碼</h3>
                <div class="space-y-4">
                    <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">舊密碼</label><input type="password" v-model="changePassInput.old" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl font-bold outline-none focus:border-blue-500"></div>
                    <div class="input-group"><label class="text-xs font-bold text-slate-500 mb-2 ml-1">新密碼</label><input type="password" v-model="changePassInput.new" class="w-full h-[50px] px-4 bg-white border border-slate-300 rounded-xl font-bold outline-none focus:border-blue-500"></div>
                    <button @click="handleChangePassword" class="w-full py-4 mt-2 rounded-2xl font-bold text-white bg-blue-600 shadow-lg active:scale-[0.98]">確認變更</button>
                </div>
             </div>
        </div>


        <div v-if="showCategoryModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[75] p-4 transition-opacity">
            <div class="bg-white rounded-[1.75rem] w-full max-w-lg shadow-2xl relative animate-slide-up md:animate-none max-h-[88vh] overflow-y-auto">
                <div class="p-5 md:p-7">
                    <div class="flex items-start justify-between gap-4 mb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"><i class="fa-solid fa-layer-group"></i></div>
                            <div><div class="text-lg font-black text-slate-800 leading-tight">編輯個股族群</div><div class="text-xs font-bold text-slate-400 mt-1">{{ categoryEditStock ? displayNameWithCode(categoryEditStock.code, categoryEditStock.name) : '' }}</div></div>
                        </div>
                        <button @click="showCategoryModal=false" class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div v-if="categoryEditStock" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs font-black text-slate-500 mb-2 block">大類股</label>
                                <div class="flex gap-2">
                                    <input v-model="categoryEditForm.sector" class="input-field flex-1 min-w-0" placeholder="例如：電子" autocomplete="off" autocorrect="off" spellcheck="false">
                                    <button type="button" @click="quickAddCategoryMasterItem('sectors', categoryEditForm.sector)" class="w-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="加入大類股清單"><i class="fa-solid fa-plus"></i></button>
                                </div>
                                <div v-if="filteredCategoryPickerOptions('sectors', categoryEditForm.sector).length" class="mt-2 flex flex-wrap gap-2">
                                    <button type="button" v-for="item in filteredCategoryPickerOptions('sectors', categoryEditForm.sector)" :key="'sector-pick-'+item" @click="setCategoryEditField('sector', item)" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black shadow-sm hover:border-blue-300 hover:text-blue-600 active:scale-95">{{ item }}</button>
                                    <button type="button" v-if="categoryPickerHasMore('sectors', categoryEditForm.sector)" @click="categoryManagerTab='sectors'; openCategoryManagerModal()" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-black">更多...</button>
                                </div>
                            </div>
                            <div>
                                <label class="text-xs font-black text-slate-500 mb-2 block">細產業</label>
                                <div class="flex gap-2">
                                    <input v-model="categoryEditForm.industry" class="input-field flex-1 min-w-0" placeholder="例如：PCB" autocomplete="off" autocorrect="off" spellcheck="false">
                                    <button type="button" @click="quickAddCategoryMasterItem('industries', categoryEditForm.industry)" class="w-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="加入細產業清單"><i class="fa-solid fa-plus"></i></button>
                                </div>
                                <div v-if="filteredCategoryPickerOptions('industries', categoryEditForm.industry).length" class="mt-2 flex flex-wrap gap-2">
                                    <button type="button" v-for="item in filteredCategoryPickerOptions('industries', categoryEditForm.industry)" :key="'industry-pick-'+item" @click="setCategoryEditField('industry', item)" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black shadow-sm hover:border-blue-300 hover:text-blue-600 active:scale-95">{{ item }}</button>
                                    <button type="button" v-if="categoryPickerHasMore('industries', categoryEditForm.industry)" @click="categoryManagerTab='industries'; openCategoryManagerModal()" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-black">更多...</button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-black text-slate-500 mb-2 block">主族群</label>
                            <div class="flex gap-2">
                                <input v-model="categoryEditForm.mainTheme" class="input-field flex-1 min-w-0" placeholder="例如：PCB / AI伺服器 / 散熱" autocomplete="off" autocorrect="off" spellcheck="false">
                                <button type="button" @click="quickAddCategoryMasterItem('themes', categoryEditForm.mainTheme)" class="w-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="加入題材族群清單"><i class="fa-solid fa-plus"></i></button>
                            </div>
                            <div v-if="filteredCategoryPickerOptions('themes', categoryEditForm.mainTheme).length" class="mt-2 flex flex-wrap gap-2">
                                <button type="button" v-for="item in filteredCategoryPickerOptions('themes', categoryEditForm.mainTheme)" :key="'theme-main-pick-'+item" @click="setCategoryEditField('mainTheme', item)" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black shadow-sm hover:border-blue-300 hover:text-blue-600 active:scale-95">{{ item }}</button>
                                <button type="button" v-if="categoryPickerHasMore('themes', categoryEditForm.mainTheme)" @click="categoryManagerTab='themes'; openCategoryManagerModal()" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-black">更多...</button>
                            </div>
                            <div class="text-[11px] font-bold text-slate-400 mt-1">Dashboard 會用主族群計算曝險與損益。</div>
                        </div>
                        <div><label class="text-xs font-black text-slate-500 mb-2 block">題材標籤</label><textarea v-model="categoryEditForm.themesText" rows="3" class="input-field !h-auto py-3" placeholder="用頓號或逗號分隔，例如：PCB、HDI、蘋果供應鏈"></textarea><div class="flex flex-wrap gap-2 mt-2"><button type="button" @click="quickAddThemesFromEditText" class="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black hover:bg-emerald-100"><i class="fa-solid fa-plus mr-1"></i>將標籤加入清單</button><button type="button" @click="openCategoryManagerModal" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-100"><i class="fa-solid fa-list-check mr-1"></i>族群管理</button></div></div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs font-bold text-slate-500 leading-relaxed">
                            目前來源：<span class="px-2 py-1 rounded-full border" :class="categorySourceClass(getStockCategory(categoryEditStock.code).source)">{{ categorySourceLabel(getStockCategory(categoryEditStock.code).source) }}</span>
                            <br>儲存後會變成「手動」設定，之後不會被自動分類覆蓋。
                        </div>
                        <div class="flex flex-col md:flex-row gap-2 pt-2">
                            <button type="button" @click="saveCategoryEdit" class="btn btn-primary flex-1"><i class="fa-solid fa-floppy-disk mr-2"></i>儲存族群</button>
                            <button type="button" @click="resetCategoryToAuto" class="btn btn-secondary flex-1"><i class="fa-solid fa-rotate-left mr-2"></i>恢復自動分類</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showCategoryManagerModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[77] p-4 transition-opacity">
            <div class="bg-white rounded-[1.75rem] w-full max-w-3xl shadow-2xl relative animate-slide-up md:animate-none max-h-[88vh] overflow-y-auto">
                <div class="p-5 md:p-7">
                    <div class="flex items-start justify-between gap-4 mb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm"><i class="fa-solid fa-list-check"></i></div>
                            <div><div class="text-lg font-black text-slate-800 leading-tight">族群管理後台</div><div class="text-xs font-bold text-slate-400 mt-1">新增、改名、刪除大類股 / 細產業 / 題材族群，不用再改程式碼。</div></div>
                        </div>
                        <button @click="showCategoryManagerModal=false" class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="grid grid-cols-3 gap-2 mb-5">
                        <button v-for="tab in categoryManagerTabs" :key="tab.key" @click="categoryManagerTab = tab.key" class="h-11 rounded-xl font-extrabold transition-all" :class="categoryManagerTab === tab.key ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 border border-slate-200'">{{ tab.label }}</button>
                    </div>

                    <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-5">
                        <div class="text-sm font-black text-emerald-800 mb-3">新增 {{ categoryManagerCurrentLabel }}</div>
                        <div class="flex flex-col md:flex-row gap-2">
                            <input v-model="categoryManagerNewName" @keyup.enter="addCategoryManagerItem" class="input-field flex-1" :placeholder="'例如：' + categoryManagerPlaceholder">
                            <button @click="addCategoryManagerItem" class="h-12 px-5 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition flex items-center justify-center gap-2"><i class="fa-solid fa-plus"></i> 新增</button>
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div class="text-sm font-black text-slate-700">{{ categoryManagerCurrentLabel }}清單</div>
                            <div class="text-xs font-bold text-slate-400">共 {{ categoryManagerItems.length }} 筆</div>
                        </div>
                        <div v-if="categoryManagerItems.length === 0" class="p-8 text-center text-slate-400 font-bold">目前沒有資料</div>
                        <div v-else class="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                            <div v-for="item in categoryManagerItems" :key="categoryManagerTab + '-' + item" class="p-3 flex items-center gap-3 hover:bg-slate-50">
                                <div class="flex-1 min-w-0"><div class="font-black text-slate-700 truncate">{{ item }}</div><div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ categoryManagerUsageLabel(item) }}</div></div>
                                <button @click="renameCategoryManagerItem(item)" class="h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black hover:bg-blue-50 hover:text-blue-600"><i class="fa-solid fa-pen mr-1"></i>改名</button>
                                <button @click="deleteCategoryManagerItem(item)" class="h-9 px-3 rounded-xl bg-white border border-rose-200 text-rose-500 text-xs font-black hover:bg-rose-50"><i class="fa-solid fa-trash mr-1"></i>刪除</button>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-bold text-amber-800 leading-relaxed">
                        改名會同步更新已手動 / 匯入的個股分類；刪除會從下拉清單移除，但不會強制刪除既有股票身上的標籤，避免誤傷歷史分類。
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showCategoryDbModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[76] p-4 transition-opacity">
            <div class="bg-white rounded-[1.75rem] w-full max-w-2xl shadow-2xl relative animate-slide-up md:animate-none max-h-[88vh] overflow-y-auto">
                <div class="p-5 md:p-7">
                    <div class="flex items-start justify-between gap-4 mb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"><i class="fa-solid fa-database"></i></div>
                            <div><div class="text-lg font-black text-slate-800 leading-tight">族群資料庫匯入 / 匯出</div><div class="text-xs font-bold text-slate-400 mt-1">可匯入台股熱門族群表，或匯出你目前的個股分類。</div></div>
                        </div>
                        <button @click="showCategoryDbModal=false" class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div class="text-xs font-bold text-slate-400">目前手動 / 匯入分類</div><div class="mt-1 text-2xl font-black text-slate-800">{{ Object.keys(stockCategories || {}).length }}</div></div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div class="text-xs font-bold text-slate-400">熱門族群表檔數</div><div class="mt-1 text-2xl font-black text-blue-700">{{ hotCategoryDbCount }}</div></div>
                        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div class="text-xs font-bold text-slate-400">未分類持股</div><div class="mt-1 text-2xl font-black text-amber-600">{{ unclassifiedHoldingCount }}</div></div>
                    </div>

                    <div class="space-y-4">
                        <div class="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <div class="text-sm font-black text-blue-800 flex items-center gap-2"><i class="fa-solid fa-bolt"></i> 內建台股熱門族群表</div>
                            <div class="text-xs font-bold text-blue-700/80 mt-1 leading-relaxed">包含 AI伺服器、PCB/CCL、散熱/水冷、光通訊/CPO、半導體設備、記憶體、重電、機器人、軍工、金融航運 ETF 等常見題材。匯入後仍可針對單檔股票手動修正。</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                                <button @click="applyHotCategoryDatabase('merge')" class="h-12 rounded-xl font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2"><i class="fa-solid fa-plus"></i> 合併匯入</button>
                                <button @click="applyHotCategoryDatabase('overwrite')" class="h-12 rounded-xl font-extrabold text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition flex items-center justify-center gap-2"><i class="fa-solid fa-arrows-rotate"></i> 覆蓋匯入</button>
                                <button @click="downloadHotCategoryDatabase" class="h-12 rounded-xl font-extrabold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 active:scale-[0.98] transition flex items-center justify-center gap-2"><i class="fa-solid fa-download"></i> 下載熱門表</button>
                            </div>
                            <div class="text-[11px] font-bold text-blue-700/80 mt-2">合併匯入：不覆蓋你已手動設定的股票。覆蓋匯入：用熱門表取代目前族群資料庫。</div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white p-4">
                            <div class="text-sm font-black text-slate-700 flex items-center gap-2"><i class="fa-solid fa-file-code text-slate-400"></i> 匯入外部族群 JSON</div>
                            <div class="text-xs font-bold text-slate-400 mt-1">支援格式：{ meta, categoryMaster, stocks }，或直接使用 stockCategories / data 作為股票分類物件。</div>
                            <div class="flex items-center gap-2 mt-4"><div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100"><i class="fa-solid fa-file-import"></i></div><div class="flex-1 min-w-0"><div class="text-xs font-bold text-slate-400 uppercase">JSON</div><div class="text-sm font-black text-slate-700 truncate">{{ categoryDbImportFileName || '尚未選擇檔案' }}</div></div></div>
                            <input ref="categoryDbImportInput" type="file" accept=".json,application/json" class="hidden" @change="onCategoryDbFileChange">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                                <button @click="$refs.categoryDbImportInput && $refs.categoryDbImportInput.click()" class="h-12 rounded-xl font-extrabold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition flex items-center justify-center gap-2"><i class="fa-solid fa-folder-open"></i> 選擇檔案</button>
                                <button :disabled="!categoryDbImportFile" @click="importCategoryDatabase('merge')" class="h-12 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"><i class="fa-solid fa-code-merge"></i> 合併匯入</button>
                                <button :disabled="!categoryDbImportFile" @click="importCategoryDatabase('overwrite')" class="h-12 rounded-xl font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"><i class="fa-solid fa-triangle-exclamation"></i> 覆蓋匯入</button>
                            </div>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div class="text-sm font-black text-slate-700 flex items-center gap-2"><i class="fa-solid fa-file-export text-slate-400"></i> 匯出目前族群資料庫</div>
                            <div class="text-xs font-bold text-slate-400 mt-1">會匯出目前的個股族群資料與下拉選單清單，不包含交易紀錄與資金資料。</div>
                            <button @click="exportCategoryDatabase" class="mt-4 w-full h-12 rounded-xl font-extrabold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition flex items-center justify-center gap-2"><i class="fa-solid fa-download"></i> 匯出我的族群資料庫</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showExportModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4 transition-opacity">
            <div class="bg-white rounded-[1.75rem] w-full max-w-md shadow-2xl relative animate-slide-up md:animate-none max-h-[85vh] overflow-y-auto">
                <div class="p-5 md:p-7">
                    <div class="flex items-start justify-between gap-4 mb-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm"><i class="fa-solid fa-cloud-arrow-down"></i></div><div><div class="text-lg font-black text-slate-800 leading-tight">備份</div><div class="text-xs font-bold text-slate-400 mt-1">下載 JSON 備份檔，或用備份檔還原資料（會覆蓋本機資料）。</div></div></div><button @click="showExportModal=false" class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
                    <div class="grid grid-cols-2 gap-2 mb-5"><button @click="backupTab='download'" :class="backupTab==='download' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 border border-slate-200'" class="h-11 rounded-xl font-extrabold transition-all"><i class="fa-solid fa-download mr-2"></i>下載備份</button><button @click="backupTab='restore'" :class="backupTab==='restore' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-50 text-slate-600 border border-slate-200'" class="h-11 rounded-xl font-extrabold transition-all"><i class="fa-solid fa-rotate-right mr-2"></i>還原備份</button></div>
                    <div v-if="backupTab==='download'"><div class="space-y-4"><div><div class="text-sm font-extrabold text-slate-700 mb-2">檔案名稱</div><div class="flex items-center gap-2"><input v-model="exportFileName" class="flex-1 h-12 rounded-xl px-4 text-slate-700 font-bold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="stock_backup_YYYY-MM-DD"><div class="text-sm font-black text-slate-400">.json</div></div><div class="text-xs font-bold text-slate-400 mt-2">包含：交易紀錄／入出金／獲利提領補回／自選股／分類／設定參數／最新價格／狀態／更新時間</div></div><div class="flex gap-3"><button @click="showExportModal=false" class="flex-1 h-12 rounded-xl font-extrabold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition-all">取消</button><button @click="confirmExport" class="flex-1 h-12 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"><i class="fa-solid fa-download"></i> 確認下載</button></div></div></div>
                    <div v-else class="space-y-4"><div class="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div class="text-sm font-black text-amber-700 flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation"></i> 還原會覆蓋目前本機資料</div><div class="text-xs font-bold text-amber-700/80 mt-1">建議先下載一份備份，再進行還原。</div></div><div class="rounded-2xl border border-slate-200 bg-white p-4"><div class="text-sm font-extrabold text-slate-700 mb-2">備份檔案</div><div class="flex items-center gap-2"><div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100"><i class="fa-solid fa-file-code"></i></div><div class="flex-1 min-w-0"><div class="text-xs font-bold text-slate-400 uppercase">JSON</div><div class="text-sm font-black text-slate-700 truncate">{{ restoreFileName || '尚未選擇檔案' }}</div></div></div><input ref="restoreFileInput" type="file" accept=".json,application/json" class="hidden" @change="onRestoreBackupFileChange"><div class="flex flex-col md:flex-row gap-3 mt-4"><button @click="$refs.restoreFileInput && $refs.restoreFileInput.click()" class="w-full md:flex-1 h-12 rounded-xl font-extrabold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"><i class="fa-solid fa-folder-open"></i> 選擇檔案</button><button :disabled="!restoreFileObject || restoreBusy" @click="confirmRestoreFromBackupFile" class="w-full md:flex-1 h-12 rounded-xl font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"><i class="fa-solid fa-rotate-right"></i> 立即還原</button></div><div v-if="restoreBusy" class="mt-3 text-xs font-bold text-slate-500 flex items-center gap-2"><i class="fa-solid fa-spinner fa-spin"></i> 正在還原備份…</div></div><div class="flex gap-3"><button @click="showExportModal=false" class="flex-1 h-12 rounded-xl font-extrabold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition-all">關閉</button><button @click="backupTab='download'" class="flex-1 h-12 rounded-xl font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"><i class="fa-solid fa-download"></i> 先下載備份</button></div></div>
                </div>
            </div>
        </div>

        <!-- Mobile Bottom Main Tabs -->
        <div class="md:hidden fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] shadow-[0_-16px_40px_-28px_rgba(15,23,42,.6)]">
            <div class="grid grid-cols-4 gap-2">
                <button type="button" @click="currentTab = 'dashboard'; showStockDetails = false" class="mobile-main-tab mobile-main-tab--dashboard flex flex-col items-center justify-center py-2"
                    :class="currentTab === 'dashboard' ? 'active' : 'hover:bg-slate-50'">
                    <i class="fa-solid fa-gauge-high text-base"></i>
                    <span class="text-[11px] mt-1 tracking-wide">總覽</span>
                </button>
                <button type="button" @click="currentTab = 'inventory'; showStockDetails = false" class="mobile-main-tab mobile-main-tab--inventory flex flex-col items-center justify-center py-2"
                    :class="currentTab === 'inventory' ? 'active' : 'hover:bg-slate-50'">
                    <i class="fa-solid fa-briefcase text-base"></i>
                    <span class="text-[11px] mt-1 tracking-wide">庫存管理</span>
                </button>
                <button type="button" @click="currentTab = 'history'; showStockDetails = false" class="mobile-main-tab mobile-main-tab--history flex flex-col items-center justify-center py-2"
                    :class="currentTab === 'history' ? 'active' : 'hover:bg-slate-50'">
                    <i class="fa-solid fa-file-invoice-dollar text-base"></i>
                    <span class="text-[11px] mt-1 tracking-wide">歷史帳務</span>
                </button>
                <button type="button" @click="currentTab = 'cash'; showStockDetails = false" class="mobile-main-tab mobile-main-tab--cash flex flex-col items-center justify-center py-2"
                    :class="currentTab === 'cash' ? 'active' : 'hover:bg-slate-50'">
                    <i class="fa-solid fa-money-bill-transfer text-base"></i>
                    <span class="text-[11px] mt-1 tracking-wide">資金流</span>
                </button>

            </div>
        </div>

    </div> `,
    data() {
        const persisted = window.StockStorage.loadInitialState();
        const chipInitial = persisted.chipCache?.stocks?.[persisted.chipLastQuery] || {};
        const riskInitial = persisted.stockRiskCache?.stocks?.[persisted.stockRiskLastQuery || persisted.chipLastQuery] || {};
        return {
            showGDriveModal: false, gdriveBusy: false, gdriveBusyText: '', gdriveCloudMeta: persisted.gdriveCloudMeta,
            showCommodityModal: false,
            showInventoryMarketPanel: false,
            showHoldingRadarDetails: false,
            inventoryStickySummaryDocked: false,
            floatingEditMode: false,
            floatingDragState: null,
            floatingPositions: (() => {
                try {
                    const parsed = JSON.parse(localStorage.getItem('tw_stock_floating_control_positions_v2') || '{}') || {};
                    return {
                        price: parsed.price && Number.isFinite(Number(parsed.price.x)) && Number.isFinite(Number(parsed.price.y)) ? { x: Number(parsed.price.x), y: Number(parsed.price.y) } : null
                    };
                } catch (_) { return { price: null }; }
            })(),
            showYahooIndexPanel: false,
            holdingsViewMode: localStorage.getItem('tw_stock_holdings_view_mode') || 'detailed',
            holdingCardOrder: (() => { try { return JSON.parse(localStorage.getItem('tw_stock_holding_card_order_v1') || '{}') || {}; } catch (_) { return {}; } })(),
            draggingHoldingCode: '',
            dragOverHoldingCode: '',
            institutionalOiData: persisted.institutionalOiData || {},
            institutionalOiLastUpdate: persisted.institutionalOiLastUpdate || '',
            institutionalOiAttemptTs: persisted.institutionalOiAttemptTs || 0,
            institutionalOiError: persisted.institutionalOiError || '',
            institutionalOiLoading: false,
            chipQueryCode: persisted.chipLastQuery || '',
            chipQueryDays: 10,
            chipData: chipInitial,
            chipCache: persisted.chipCache || { version: 2, stocks: {} },
            chipLastQuery: persisted.chipLastQuery || '',
            chipLastUpdate: persisted.chipLastUpdate || '',
            chipError: persisted.chipError || '',
            chipLoading: false,
            chipBatchLoading: false,
            chipBatchDone: 0,
            chipBatchTotal: 0,
            chipBatchMessage: '',
            stockRiskData: riskInitial,
            stockRiskCache: persisted.stockRiskCache || { version: 2, stocks: {} },
            stockRiskLastQuery: persisted.stockRiskLastQuery || persisted.chipLastQuery || '',
            stockRiskLastUpdate: persisted.stockRiskLastUpdate || '',
            stockRiskError: persisted.stockRiskError || '',
            stockRiskLoading: false,
            stockRiskLookbackDays: 60,
            gdriveClientId: persisted.gdriveClientId, gdriveClientIdInput: persisted.gdriveClientId,
            // --- Portfolios (separate books) ---
            showPortfolioModal: false,
            portfolios: persisted.portfolios,
            currentPortfolioId: persisted.currentPortfolioId,
            newPortfolioName: '',

            isLoggedIn: false, authMode: 'login', authInput: { username: '', password: '', confirmPassword: '' }, rememberUser: false, authError: '', securityConfig: { enabled: true, username: '', passwordHash: '' }, showSecurityModal: false, showChangePasswordModal: false, changePassInput: { old: '', new: '' },
            currentTab: 'dashboard', showStockDetails: false, selectedStock: null,
            transactions: persisted.transactions, newTx: { date: new Date().toISOString().split('T')[0], code: '', name: '', type: 'buy', mode: 'cash', price: null, qty: 1000, category: 'core', dayTradeEligible: false },
            cashBook: persisted.cashBook,
            profitAdjustments: persisted.profitAdjustments,
            cashEntryForm: { date: new Date().toISOString().split('T')[0], type: 'deposit', amount: null, note: '' },
            profitAdjustmentForm: { date: new Date().toISOString().split('T')[0], type: 'withdraw', category: 'living', amount: null, note: '' },
            cashViewMode: 'all', // all | cashOnly | tradesOnly


            // --- Advanced: Cash short modal (buy requires top-up) ---
            showCashShortModal: false,
            cashShortTarget: '',
            cashShortTradeDate: '',
            cashShortCurrentCash: 0,
            cashShortBuyCost: 0,
            cashShortNeeded: 0,
            cashShortForm: { amount: null, note: '' },
            pendingCashShortTx: null,
            pendingCashShortMeta: null,
            showSellModal: false, sellTx: { date: '', code: '', name: '', price: 0, qty: 0, maxQty: 0, category: '', mode: 'cash', dayTradeEligible: false },
            showEditBuyModal: false, editBuyTx: { id: null, date: '', code: '', name: '', price: null, qty: 0, category: 'core' },
            showEditTxModal: false, editTx: { id: null, date: '', code: '', name: '', type: 'buy', mode: 'cash', price: null, qty: 0, category: 'core', dayTradeEligible: false },
            showAddModal: false, searchText: '', isSearching: false,
            settings: persisted.settings,
            showSettings: false, showExportModal: false, backupTab: 'download', exportFileName: '', restoreFileName: '', restoreFileObject: null, restoreBusy: false,
            showInfoModal: false, infoTitle: '', infoMessage: '', showConfirmModal: false, confirmTitle: '', confirmMessage: '', confirmCallback: null,
            showGlobalIndices: false, isGlobalLoading: false, isTaiexNightLoading: false, globalIndices: [],
            globalIndicesLastTs: persisted.globalIndicesLastTs,
            globalIndicesError: persisted.globalIndicesError, globalIndicesPartial: persisted.globalIndicesPartial, globalIndicesMissingCount: persisted.globalIndicesMissingCount, globalIndicesAttemptTs: persisted.globalIndicesAttemptTs,
            showHelpModal: false,
            filter: 'all', suggestions: [], showSuggestions: false, customStocks: persisted.customStocks, 
            latestPrices: persisted.latestPrices, latestStatus: persisted.latestStatus, lastUpdateTime: persisted.lastUpdateTime,
            lastUpdateTimestamp: persisted.lastUpdateTimestamp, lastPriceUpdateError: persisted.lastPriceUpdateError, lastPriceUpdateAttemptTs: persisted.lastPriceUpdateAttemptTs, lastPriceUpdatePartial: persisted.lastPriceUpdatePartial, lastPriceUpdateMissingCount: persisted.lastPriceUpdateMissingCount, priceStaleThresholdMinutes: 180, isLoading: false,
            dateFilterMode: 'thisMonth', filterStart: '', filterEnd: '', historyTypeFilter: 'all',
            contextMenu: { visible: false, x: 0, y: 0, stock: null },
            rawStockData: ["2330:台積電","2317:鴻海","2454:聯發科","2603:長榮","2609:陽明","2615:萬海","0050:元大台灣50","0056:元大高股息","00878:國泰永續高股息"], baseStockMap: [], nameMap: persisted.nameMap, categories: persisted.categories, newCategoryName: "",
            stockCategories: persisted.stockCategories || {}, categoryMaster: persisted.categoryMaster || (window.StockCategoryService ? window.StockCategoryService.DEFAULT_CATEGORY_MASTER : { sectors: [], industries: [], themes: [] }),
            showCategoryModal: false, categoryEditStock: null, categoryEditForm: { sector: '', industry: '', mainTheme: '', themesText: '' },
            showCategoryDbModal: false, categoryDbImportFileName: '', categoryDbImportFile: null,
            showCategoryManagerModal: false, categoryManagerTab: 'themes', categoryManagerNewName: '',
            
            // --- NEW: History Analysis State ---
            historyMode: 'list', // 'list' | 'analysis'
            showRealizedDetail: false, realizedDetailCode: '',
            saveStatus: window.StockSaveStatus.initialState()
        }
    },
    mounted() {
        this.gdriveClientId = localStorage.getItem(window.StockStorage.KEYS.gdriveClientId) || ''; this.gdriveClientIdInput = this.gdriveClientId;
        this.baseStockMap = this.rawStockData.map(s => { const [code, name] = s.split(':'); return { code, name }; });
        const savedNames = localStorage.getItem(window.StockStorage.KEYS.stockNames) || ''; if (savedNames) { try { this.nameMap = JSON.parse(savedNames) || {}; } catch(_) { this.nameMap = {}; } try { Object.keys(this.nameMap || {}).forEach(k => { let v = String(this.nameMap[k] || '').replace(/\s+/g,' ').trim(); if (!v || /yahoo|奇摩股市|yahoo股市/i.test(v)) { delete this.nameMap[k]; return; } v = v.replace(/(走勢圖|即時行情|技術分析|討論|個股|公司資料|股價)/g,'').trim(); v = v.replace(/\(\s*[0-9A-Za-z]{4,8}(?:\.(?:TW|TWO))?\s*\)/gi,'').trim(); v = v.replace(/\b\d{4,6}[A-Za-z]{0,2}(?:\.(?:TW|TWO))?\b/ig,'').trim(); v = v.replace(/\s+\d{2,3}\s*$/,'').trim();  v = v.replace(/\bTOP\s*\d+\b/ig,'').trim(); v = v.replace(/\bETF\b/ig,'').trim(); v = v.replace(/\s{2,}/g,' ').trim(); if (!v) { delete this.nameMap[k]; return; } this.nameMap[k] = v; }); localStorage.setItem(window.StockStorage.KEYS.stockNames, JSON.stringify(this.nameMap || {})); } catch(_) {} }
                const savedTx = localStorage.getItem(window.StockStorage.KEYS.transactions); if (savedTx) this.transactions = JSON.parse(savedTx);
const savedCash = localStorage.getItem(window.StockStorage.KEYS.cashBook) || ''; if (savedCash) { try { const parsed = JSON.parse(savedCash); this.cashBook = Array.isArray(parsed) ? parsed : []; } catch(_) { this.cashBook = []; } }
        if (!Array.isArray(this.cashBook)) this.cashBook = [];
        const savedProfitAdjustments = localStorage.getItem(window.StockStorage.KEYS.profitAdjustments) || ''; if (savedProfitAdjustments) { try { const parsed = JSON.parse(savedProfitAdjustments); this.profitAdjustments = Array.isArray(parsed) ? parsed : []; } catch(_) { this.profitAdjustments = []; } }
        if (!Array.isArray(this.profitAdjustments)) this.profitAdjustments = [];
        // Migrate legacy cash entries (ensure portfolioId / normalize fields)
        try {
            let changed = false;
            this.cashBook = (this.cashBook || []).filter(e => e && typeof e === 'object').map(e => {
                const out = { ...e };
                if (!out.id) { out.id = Date.now() + Math.floor(Math.random() * 100000); changed = true; }
                if (!out.portfolioId) { out.portfolioId = 'main'; changed = true; }
                if (!out.date) { out.date = new Date().toISOString().split('T')[0]; changed = true; }
                if (!out.type) { out.type = 'deposit'; changed = true; }
                out.type = String(out.type || 'deposit');
                if (!['initial','deposit','withdraw'].includes(out.type)) { out.type = 'deposit'; changed = true; }
                out.amount = Math.abs(Number(out.amount) || 0);
                out.note = String(out.note || '');
                return out;
            });
            if (changed) localStorage.setItem(window.StockStorage.KEYS.cashBook, JSON.stringify(this.cashBook || []));
        } catch(_) {}
        const savedCats = localStorage.getItem(window.StockStorage.KEYS.categories) || '';
        if (savedCats) { try { this.categories = JSON.parse(savedCats) || []; } catch(_) { this.categories = []; } }
        if (!Array.isArray(this.categories)) this.categories = [];
        // Ensure default categories
        const ensureCat = (id, name, label, shortLabel) => {
            if (!this.categories.some(c => c && c.id === id)) this.categories.unshift({ id, name, label, shortLabel });
        };
        ensureCat('core', '主力', '🛡️ 主力 (長期)', '主力');
        ensureCat('rotation', '輪動', '🔄 輪動 (短期)', '輪動');
        // Migrate legacy categories from existing transactions (e.g. pocket/lucky)
        try {
            const used = new Set((this.transactions || []).map(t => t && t.category).filter(Boolean));
            used.forEach(cat => {
                if (typeof cat !== 'string') return;
                if (this.categories.some(c => c && c.id === cat)) return;
                if (cat === 'pocket') this.categories.push({ id: 'pocket', name: '零用錢', label: '零用錢', shortLabel: '零用錢' });
                else if (cat === 'lucky') this.categories.push({ id: 'lucky', name: '壓歲錢', label: '壓歲錢', shortLabel: '壓歲錢' });
                else this.categories.push({ id: cat, name: cat, label: cat, shortLabel: cat });
            });
        } catch(_) {}
        localStorage.setItem(window.StockStorage.KEYS.categories, JSON.stringify(this.categories));
        // Ensure newTx.category default
        if (!this.newTx.category) this.newTx.category = (this.categories.find(c => c.id === 'core') || this.categories[0] || {id:'core'}).id;

        const savedSettings = localStorage.getItem(window.StockStorage.KEYS.settings); if (savedSettings) this.settings = JSON.parse(savedSettings);
        if (this.settings == null || typeof this.settings !== 'object') this.settings = { feeRate: 0.1425, discount: 1, taxRate: 0.3, dayTradeTaxRate: 0.15, minFee: 20 };
        if (this.settings.dayTradeTaxRate == null || isNaN(Number(this.settings.dayTradeTaxRate))) this.settings.dayTradeTaxRate = 0.15;
        if (this.settings.feeRate == null || isNaN(Number(this.settings.feeRate))) this.settings.feeRate = 0.1425;
        if (this.settings.taxRate == null || isNaN(Number(this.settings.taxRate))) this.settings.taxRate = 0.3;
        if (this.settings.minFee == null || isNaN(Number(this.settings.minFee))) this.settings.minFee = 20;
        if (this.settings.discount == null || isNaN(Number(this.settings.discount)) || Number(this.settings.discount) <= 0) this.settings.discount = 1;
        const looksLikeLegacyDefault = Number(this.settings.feeRate) === 0.1425 && Number(this.settings.discount) === 0.28 && Number(this.settings.taxRate) === 0.3 && Number(this.settings.dayTradeTaxRate) === 0.15 && Number(this.settings.minFee) === 20;
        if (looksLikeLegacyDefault) {
            this.settings.discount = 1;
            localStorage.setItem(window.StockStorage.KEYS.settings, JSON.stringify(this.settings));
        }
        const savedCustom = localStorage.getItem(window.StockStorage.KEYS.customStocks); if (savedCustom) this.customStocks = JSON.parse(savedCustom);
        const savedPrices = localStorage.getItem(window.StockStorage.KEYS.prices); if (savedPrices) this.latestPrices = JSON.parse(savedPrices);
        const savedStatus = localStorage.getItem(window.StockStorage.KEYS.priceStatus); if (savedStatus) this.latestStatus = JSON.parse(savedStatus);
        const savedTime = localStorage.getItem(window.StockStorage.KEYS.priceUpdateTime); if (savedTime) this.lastUpdateTime = savedTime;
        const savedTimeTs = localStorage.getItem(window.StockStorage.KEYS.priceUpdateTimestamp); if (savedTimeTs) this.lastUpdateTimestamp = Number(savedTimeTs) || 0;
        this.initPortfoliosAndMigrate();
        try { this.recomputeAllTradesAndValidate(); } catch (_) {}
        const savedAuth = localStorage.getItem(window.StockStorage.KEYS.auth); const savedUser = localStorage.getItem(window.StockStorage.KEYS.savedUsername);
        if (savedUser) { this.authInput.username = savedUser; this.rememberUser = true; }
        if (savedAuth) { this.securityConfig = JSON.parse(savedAuth); if (this.securityConfig.enabled) { this.authMode = 'login'; this.isLoggedIn = false; } else { this.isLoggedIn = true; } } else { this.authMode = 'setup'; this.isLoggedIn = false; }
        window.addEventListener('click', this.handleGlobalClick, true); window.addEventListener('resize', this.closeContextMenu); window.addEventListener('scroll', this.closeContextMenu, true); window.addEventListener('scroll', this.updateInventoryStickySummaryDocked, { passive: true });
        this.updateInventoryStickySummaryDocked();
        this.setDateFilter('thisMonth');
        this.$nextTick(() => {
            if (this.saveStatus) {
                this.saveStatus.ready = true;
                window.StockSaveStatus.markSaved(this, '資料');
            }
        });
    },
    beforeUnmount() { window.StockSaveStatus.clearTimer(this); this.stopFloatingControlDrag(); window.removeEventListener('click', this.handleGlobalClick, true); window.removeEventListener('resize', this.closeContextMenu); window.removeEventListener('scroll', this.closeContextMenu, true); window.removeEventListener('scroll', this.updateInventoryStickySummaryDocked); },
    computed: {
        hotCategoryDbCount() { const db = window.StockCategoryService && window.StockCategoryService.HOT_STOCK_CATEGORY_DATABASE_2026; return db && db.stocks ? Object.keys(db.stocks).length : 0; },
        unclassifiedHoldingCount() { return (this.holdings || []).filter(s => this.getStockCategory(s.code).source === 'unclassified').length; },
        institutionalOiRows() { return Array.isArray(this.institutionalOiData?.rows) ? this.institutionalOiData.rows : []; },
        institutionalForeignOiNet() { const row = this.institutionalOiRows.find(r => r && /外資/.test(String(r.identity || ''))); return row ? Number(row.oiNet || 0) : 0; },
        institutionalTotalOiNet() { return this.institutionalOiRows.reduce((sum, row) => sum + Number(row?.oiNet || 0), 0); },
        chipRows() { return Array.isArray(this.chipData?.institutionalRows) ? this.chipData.institutionalRows : []; },
        chipMarginRows() { return Array.isArray(this.chipData?.marginRows) ? this.chipData.marginRows : []; },
        chipSummary() { return this.chipData?.summary || {}; },
        institutionalOiAnalysis() {
            if (!this.institutionalOiRows.length) return null;
            const foreign = Number(this.institutionalForeignOiNet || 0);
            const total = Number(this.institutionalTotalOiNet || 0);
            const absForeign = Math.abs(foreign);
            const absTotal = Math.abs(total);
            const points = [];
            let signal = '中性';
            let title = '法人未平倉偏中性，先觀察量能與現貨同步性';
            let summary = '目前外資與三大法人合計未平倉沒有形成明確同向訊號，較適合搭配夜盤、現貨量價與重要支撐壓力一起判斷。';
            let className = 'text-slate-700 bg-slate-50 border-slate-200';
            let icon = 'fa-scale-balanced text-slate-600';
            if (foreign > 0 && total > 0) {
                signal = absForeign >= 5000 || absTotal >= 5000 ? '偏多' : '小幅偏多';
                title = '外資與三大法人合計同步偏多';
                summary = '外資及三大法人合計未平倉淨額都站在多方，短線籌碼對台指相對有支撐，但仍要留意隔日現貨是否跟上。';
                className = 'text-red-700 bg-red-50 border-red-200';
                icon = 'fa-arrow-trend-up text-red-600';
            } else if (foreign < 0 && total < 0) {
                signal = absForeign >= 5000 || absTotal >= 5000 ? '偏空' : '小幅偏空';
                title = '外資與三大法人合計同步偏空';
                summary = '外資及三大法人合計未平倉淨額都偏空，短線台指壓力較高，隔日若現貨開低或量能不足，要提高風險控管。';
                className = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                icon = 'fa-arrow-trend-down text-emerald-600';
            } else if (foreign < 0 && total > 0) {
                signal = '外資偏空';
                title = '外資偏空，但三大法人合計仍偏多';
                summary = '外資未平倉站在空方，但合計仍為多方，代表不同法人方向不完全一致，短線容易震盪，建議不要只看單一數字。';
                className = 'text-amber-700 bg-amber-50 border-amber-200';
                icon = 'fa-triangle-exclamation text-amber-600';
            } else if (foreign > 0 && total < 0) {
                signal = '分歧';
                title = '外資偏多，但三大法人合計偏空';
                summary = '外資站在多方，但整體合計偏空，代表自營商或投信可能拉低合計方向，盤勢可能有拉扯。';
                className = 'text-amber-700 bg-amber-50 border-amber-200';
                icon = 'fa-code-branch text-amber-600';
            }
            points.push(`外資未平倉淨額：${foreign >= 0 ? '+' : ''}${this.formatCurrency(foreign)} 口`);
            points.push(`三大法人合計淨額：${total >= 0 ? '+' : ''}${this.formatCurrency(total)} 口`);
            if (absForeign >= 10000 || absTotal >= 10000) points.push('未平倉部位較大，隔日台指波動可能放大。');
            else if (absForeign < 2000 && absTotal < 2000) points.push('淨額不大，方向參考性較弱，建議搭配現貨與夜盤。');
            else points.push('部位有方向但尚非極端，適合作為輔助判斷。');
            return { signal, title, summary, points, className, icon };
        },
        chipOverviewCard() {
            if (!this.chipRows.length && !this.chipMarginRows.length) return null;
            const overview = this.chipData?.overview || {};
            const latest = (this.chipSummary && this.chipSummary.latest) || this.chipRows[0] || {};
            const marginRows = this.chipMarginRows || [];
            const latestMargin = marginRows[0] || {};
            const prevMargin = marginRows[1] || null;
            const financeBalance = Number(overview.financeBalance ?? latestMargin.financeBalance ?? 0);
            const shortBalance = Number(overview.shortBalance ?? latestMargin.shortBalance ?? 0);
            let financeDiff = overview.financeDiff;
            let shortDiff = overview.shortDiff;
            if (financeDiff == null && latestMargin) financeDiff = prevMargin ? financeBalance - Number(prevMargin.financeBalance || 0) : Number(latestMargin.financeBuy || 0) - Number(latestMargin.financeSell || 0);
            if (shortDiff == null && latestMargin) shortDiff = prevMargin ? shortBalance - Number(prevMargin.shortBalance || 0) : Number(latestMargin.shortSell || 0) - Number(latestMargin.shortBuy || 0);
            const volumeLots = Number(overview.volumeLots || Math.round(Number(latest.volumeShares || 0) / 1000) || 0);
            const dayTradeLots = Number(overview.dayTradeLots || 0);
            const shortMarginRatio = Number.isFinite(Number(overview.shortMarginRatio)) ? Number(overview.shortMarginRatio) : (financeBalance > 0 ? shortBalance / financeBalance : null);
            const dayTradeRatio = Number.isFinite(Number(overview.dayTradeRatio)) ? Number(overview.dayTradeRatio) : null;
            const turnoverRate = Number.isFinite(Number(overview.turnoverRate)) ? Number(overview.turnoverRate) : null;
            const formatSignedLots = (value, buyText = '買', sellText = '賣') => {
                const n = Number(value || 0);
                if (!n) return '0 張';
                const abs = this.formatCurrency(Math.abs(n));
                const size = Math.abs(n) >= 10000 ? '大' : (Math.abs(n) >= 1000 ? '中' : '小');
                return `${size}${n > 0 ? buyText : sellText} ${abs} 張`;
            };
            const formatDiffLots = (value) => {
                if (value == null || !Number.isFinite(Number(value))) return '-';
                const n = Number(value || 0);
                if (!n) return '持平';
                return `${n > 0 ? '增加' : '減少'} ${this.formatCurrency(Math.abs(n))} 張`;
            };
            const pct = (value) => value == null || !Number.isFinite(Number(value)) ? '-' : `${(Number(value) * 100).toFixed(2)}%`;
            const items = [
                { key: 'volume', label: '成交量', value: volumeLots ? `${this.formatCurrency(volumeLots)} 張` : '-', className: 'text-slate-800' },
                { key: 'foreign', label: '外資', value: formatSignedLots(overview.foreignNetLots ?? latest.foreignNetLots ?? 0), className: Number(overview.foreignNetLots ?? latest.foreignNetLots ?? 0) >= 0 ? 'text-up' : 'text-down' },
                { key: 'trust', label: '投信', value: formatSignedLots(overview.trustNetLots ?? latest.trustNetLots ?? 0), className: Number(overview.trustNetLots ?? latest.trustNetLots ?? 0) >= 0 ? 'text-up' : 'text-down' },
                { key: 'dealer', label: '自營商', value: formatSignedLots(overview.dealerNetLots ?? latest.dealerNetLots ?? 0), className: Number(overview.dealerNetLots ?? latest.dealerNetLots ?? 0) >= 0 ? 'text-up' : 'text-down' },
                { key: 'finance', label: '融資', value: formatDiffLots(financeDiff), sub: financeBalance ? `餘額 ${this.formatCurrency(financeBalance)} 張` : '', className: Number(financeDiff || 0) > 0 ? 'text-down' : (Number(financeDiff || 0) < 0 ? 'text-up' : 'text-slate-800') },
                { key: 'short', label: '融券', value: formatDiffLots(shortDiff), sub: shortBalance ? `餘額 ${this.formatCurrency(shortBalance)} 張` : '', className: Number(shortDiff || 0) > 0 ? 'text-amber-600' : (Number(shortDiff || 0) < 0 ? 'text-up' : 'text-slate-800') },
                { key: 'shortMarginRatio', label: '券資比', value: pct(shortMarginRatio), className: shortMarginRatio != null && shortMarginRatio >= 0.15 ? 'text-amber-600' : 'text-slate-800' },
                { key: 'dayTrade', label: '當沖', value: dayTradeLots ? `${this.formatCurrency(dayTradeLots)} 張` : '-', className: 'text-slate-800' },
                { key: 'dayTradeRatio', label: '當沖率', value: pct(dayTradeRatio), className: dayTradeRatio != null && dayTradeRatio >= 0.5 ? 'text-amber-600' : 'text-slate-800' },
                { key: 'turnover', label: '周轉率', value: pct(turnoverRate), className: turnoverRate != null && turnoverRate >= 0.08 ? 'text-amber-600' : 'text-slate-800' },
            ];
            return {
                dateLabel: overview.dateLabel || latest.dateLabel || latestMargin.dateLabel || '',
                volumeLots,
                foreignNetLots: Number(overview.foreignNetLots ?? latest.foreignNetLots ?? 0),
                trustNetLots: Number(overview.trustNetLots ?? latest.trustNetLots ?? 0),
                dealerNetLots: Number(overview.dealerNetLots ?? latest.dealerNetLots ?? 0),
                financeDiff: financeDiff == null ? null : Number(financeDiff),
                shortDiff: shortDiff == null ? null : Number(shortDiff),
                shortMarginRatio,
                dayTradeLots,
                dayTradeRatio,
                turnoverRate,
                items,
            };
        },
        chipOverviewAnalysis() {
            const o = this.chipOverviewCard;
            if (!o) return null;
            let score = 0;
            const points = [];
            const totalInst = o.foreignNetLots + o.trustNetLots + o.dealerNetLots;
            if (o.foreignNetLots <= -10000) { score -= 2; points.push(`外資大賣 ${this.formatCurrency(Math.abs(o.foreignNetLots))} 張，短線法人賣壓明顯。`); }
            else if (o.foreignNetLots >= 10000) { score += 2; points.push(`外資大買 ${this.formatCurrency(o.foreignNetLots)} 張，外資買盤支撐明顯。`); }
            else if (o.foreignNetLots < 0) { score -= 1; points.push(`外資賣超 ${this.formatCurrency(Math.abs(o.foreignNetLots))} 張，短線偏保守。`); }
            else if (o.foreignNetLots > 0) { score += 1; points.push(`外資買超 ${this.formatCurrency(o.foreignNetLots)} 張，法人方向略偏正向。`); }
            if (o.trustNetLots > 0 && o.foreignNetLots < 0) points.push(`投信買超 ${this.formatCurrency(o.trustNetLots)} 張但外資賣超，法人方向分歧。`);
            else if (o.trustNetLots > 0) { score += 1; points.push(`投信買超 ${this.formatCurrency(o.trustNetLots)} 張，對中期籌碼有加分。`); }
            if (o.financeDiff != null) {
                if (o.financeDiff > 0) { score -= 1; points.push(`融資增加 ${this.formatCurrency(Math.abs(o.financeDiff))} 張，代表散戶槓桿籌碼增加，若股價沒有同步轉強容易偏擁擠。`); }
                else if (o.financeDiff < 0) { score += 1; points.push(`融資減少 ${this.formatCurrency(Math.abs(o.financeDiff))} 張，散戶籌碼壓力下降。`); }
            }
            if (o.shortDiff != null) {
                if (o.shortDiff > 0) points.push(`融券增加 ${this.formatCurrency(Math.abs(o.shortDiff))} 張，空方籌碼增加；若股價反而轉強，後續可能有軋空題材。`);
                else if (o.shortDiff < 0) { score += 1; points.push(`融券減少 ${this.formatCurrency(Math.abs(o.shortDiff))} 張，空單回補，短線壓力下降。`); }
            }
            if (o.dayTradeRatio != null && o.dayTradeRatio >= 0.5) { score -= 1; points.push(`當沖率 ${(o.dayTradeRatio * 100).toFixed(2)}% 偏高，短線資金熱絡但隔日波動也容易放大。`); }
            else if (o.dayTradeRatio != null && o.dayTradeRatio >= 0.25) points.push(`當沖率 ${(o.dayTradeRatio * 100).toFixed(2)}%，短線交易熱度中等偏高。`);
            if (o.turnoverRate != null && o.turnoverRate >= 0.1) points.push(`周轉率 ${(o.turnoverRate * 100).toFixed(2)}% 偏高，代表籌碼換手快速，適合搭配支撐壓力觀察。`);
            if (!points.length) points.push('目前公開資料顯示籌碼變化不大，建議等待法人方向、成交量或股價型態確認。');
            let signal = '中性觀察', title = '籌碼訊號尚未明確', className = 'text-slate-700 bg-slate-50 border-slate-200', icon = 'fa-scale-balanced text-slate-600';
            if (score >= 3) { signal = '綜合偏多'; title = '法人與籌碼結構偏正向'; className = 'text-red-700 bg-red-50 border-red-200'; icon = 'fa-arrow-trend-up text-red-600'; }
            else if (score <= -3) { signal = '綜合偏空'; title = '賣壓或短線過熱風險較高'; className = 'text-emerald-700 bg-emerald-50 border-emerald-200'; icon = 'fa-arrow-trend-down text-emerald-600'; }
            else if (score > 0) { signal = '小幅偏多'; title = '籌碼略偏正向但還需確認'; className = 'text-orange-700 bg-orange-50 border-orange-200'; icon = 'fa-chart-line text-orange-600'; }
            else if (score < 0) { signal = '小幅偏空'; title = '短線籌碼略偏保守'; className = 'text-amber-700 bg-amber-50 border-amber-200'; icon = 'fa-triangle-exclamation text-amber-600'; }
            const summary = points.slice(0, 2).join(' ');
            return { signal, title, summary, points: points.slice(2, 6), className, icon, totalInst };
        },
        chipAutoAnalysis() {
            if (!this.chipRows.length) return null;
            const s = this.chipSummary || {};
            const latest = s.latest || this.chipRows[0] || {};
            const latestTotal = Number(latest.totalNetLots || 0);
            const foreignLatest = Number(latest.foreignNetLots || 0);
            const trustLatest = Number(latest.trustNetLots || 0);
            const total5 = Number(s.total5 || 0);
            const total20 = Number(s.total20 || 0);
            const foreign5 = Number(s.foreign5 || 0);
            const streak = Number(s.streak || 0);
            const margin = this.chipMarginRows[0] || null;
            const risk = this.stockRiskSummary || {};
            const riskLevel = String(risk.level || '');
            let score = 0;
            if (latestTotal > 0) score += 1;
            if (latestTotal < 0) score -= 1;
            if (total5 > 0) score += 1;
            if (total5 < 0) score -= 1;
            if (foreignLatest > 0) score += 1;
            if (foreignLatest < 0) score -= 1;
            if (trustLatest > 0) score += 1;
            if (trustLatest < 0) score -= 1;
            if (streak >= 3) score += 1;
            if (streak <= -3) score -= 1;
            if (riskLevel === 'disposition') score -= 2;
            else if (riskLevel === 'warning' || riskLevel === 'attention') score -= 1;
            let signal = '中性觀察';
            let className = 'text-slate-700 bg-slate-50 border-slate-200';
            let icon = 'fa-scale-balanced text-slate-600';
            let title = '籌碼尚未形成明確方向';
            if (score >= 3) {
                signal = '籌碼偏多';
                className = 'text-red-700 bg-red-50 border-red-200';
                icon = 'fa-arrow-trend-up text-red-600';
                title = '法人買盤偏正向，短線籌碼有支撐';
            } else if (score <= -3) {
                signal = '籌碼偏空';
                className = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                icon = 'fa-arrow-trend-down text-emerald-600';
                title = '法人賣壓或風險訊號較明顯';
            } else if (score > 0) {
                signal = '小幅偏多';
                className = 'text-orange-700 bg-orange-50 border-orange-200';
                icon = 'fa-chart-line text-orange-600';
                title = '籌碼略偏正向，但仍需確認延續性';
            } else if (score < 0) {
                signal = '小幅偏空';
                className = 'text-amber-700 bg-amber-50 border-amber-200';
                icon = 'fa-triangle-exclamation text-amber-600';
                title = '籌碼略偏保守，留意追價風險';
            }
            const points = [];
            points.push(`最新三大法人合計：${latestTotal >= 0 ? '+' : ''}${this.formatCurrency(latestTotal)} 張，近 5 筆合計：${total5 >= 0 ? '+' : ''}${this.formatCurrency(total5)} 張。`);
            points.push(`外資近 5 筆合計：${foreign5 >= 0 ? '+' : ''}${this.formatCurrency(foreign5)} 張，投信最新：${trustLatest >= 0 ? '+' : ''}${this.formatCurrency(trustLatest)} 張。`);
            if (streak > 0) points.push(`三大法人已連續買超 ${Math.abs(streak)} 筆，若股價同步轉強，籌碼延續性較佳。`);
            else if (streak < 0) points.push(`三大法人已連續賣超 ${Math.abs(streak)} 筆，若股價反彈但法人仍賣，需留意反彈力道。`);
            else points.push('近期買賣超沒有明顯連續性，較適合等待方向確認。');
            if (margin) {
                const financeNet = Number(margin.financeBuy || 0) - Number(margin.financeSell || 0);
                const shortNet = Number(margin.shortSell || 0) - Number(margin.shortBuy || 0);
                if (financeNet > 0) points.push(`融資當日估計增加 ${this.formatCurrency(financeNet)} 張，若股價未同步上攻，籌碼可能偏擁擠。`);
                else if (financeNet < 0) points.push(`融資當日估計減少 ${this.formatCurrency(Math.abs(financeNet))} 張，散戶籌碼壓力略降。`);
                if (shortNet > 0) points.push(`融券當日估計增加 ${this.formatCurrency(shortNet)} 張，短線分歧與波動可能提高。`);
            }
            if (riskLevel === 'disposition') points.push('目前查到處置相關紀錄，短線交易限制與波動風險需優先確認。');
            else if (riskLevel === 'warning' || riskLevel === 'attention') points.push('目前查到注意或累計異常紀錄，追價前建議先確認官方公告條件。');
            else points.push('近查詢區間未找到注意 / 處置紀錄，風險標籤暫時偏正常。');
            const summary = points.slice(0, 2).join(' ');
            return { signal, title, summary, points: points.slice(2), className, icon };
        },
        chipMarginAnalysis() {
            const rows = this.chipMarginRows || [];
            if (!rows.length) return null;
            const latest = rows[0] || {};
            const prev = rows[1] || null;
            const financeBalance = Number(latest.financeBalance || 0);
            const shortBalance = Number(latest.shortBalance || 0);
            let financeDiff = 0;
            let shortDiff = 0;
            let hasPrev = false;
            if (prev) {
                hasPrev = true;
                financeDiff = financeBalance - Number(prev.financeBalance || 0);
                shortDiff = shortBalance - Number(prev.shortBalance || 0);
            } else {
                const buy = Number(latest.financeBuy || 0);
                const sell = Number(latest.financeSell || 0);
                const shortSell = Number(latest.shortSell || 0);
                const shortBuy = Number(latest.shortBuy || 0);
                if (buy || sell || shortSell || shortBuy) {
                    financeDiff = buy - sell;
                    shortDiff = shortSell - shortBuy;
                } else {
                    return null;
                }
            }
            const absFinance = Math.abs(financeDiff);
            const absShort = Math.abs(shortDiff);
            const financeBase = Math.max(1, Math.abs(financeBalance - financeDiff), financeBalance);
            const shortBase = Math.max(1, Math.abs(shortBalance - shortDiff), shortBalance);
            const financePct = absFinance / financeBase;
            const shortPct = absShort / shortBase;
            const latestInst = (this.chipSummary && this.chipSummary.latest) || (this.chipRows && this.chipRows[0]) || {};
            const instNet = Number(latestInst.totalNetLots || 0);
            let score = 0;
            if (financeDiff > 0 && instNet <= 0) score -= 2;
            else if (financeDiff > 0) score -= 1;
            if (financeDiff < 0 && instNet >= 0) score += 2;
            else if (financeDiff < 0) score += 1;
            if (shortDiff > 0 && instNet > 0) score += 1;
            else if (shortDiff > 0 && instNet < 0) score -= 1;
            if (shortDiff < 0 && instNet >= 0) score += 1;
            else if (shortDiff < 0 && instNet < 0) score -= 1;
            if (financePct >= 0.08 && financeDiff > 0) score -= 1;
            if (shortPct >= 0.15 && shortDiff < 0) score += 1;
            let signal = '中性觀察';
            let title = '融資融券變化不大，籌碼偏中性';
            let summary = '融資與融券沒有出現明顯單邊變化，建議搭配法人買賣超、股價位置與成交量一起判斷。';
            let className = 'text-slate-700 bg-slate-50 border-slate-200';
            let badgeClass = 'bg-slate-100 text-slate-700';
            let icon = 'fa-scale-balanced text-slate-600';
            if (score >= 3) {
                signal = '偏多';
                title = '融資壓力下降或空單回補，籌碼結構偏健康';
                summary = '融資下降通常代表散戶槓桿籌碼減輕；若同時法人買超或融券回補，短線籌碼支撐較佳。';
                className = 'text-red-700 bg-red-50 border-red-200';
                badgeClass = 'bg-red-100 text-red-700';
                icon = 'fa-arrow-trend-up text-red-600';
            } else if (score <= -3) {
                signal = '偏空';
                title = '融資壓力或放空籌碼增加，短線需保守';
                summary = '融資增加代表散戶槓桿籌碼變多；若法人同步偏賣或股價未轉強，容易形成上方賣壓。';
                className = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                badgeClass = 'bg-emerald-100 text-emerald-700';
                icon = 'fa-arrow-trend-down text-emerald-600';
            } else if (score > 0) {
                signal = '小幅偏多';
                title = '融資融券略偏正向，但還不是強訊號';
                summary = '籌碼有改善跡象，但變化幅度或法人方向還不夠一致，適合列入觀察。';
                className = 'text-orange-700 bg-orange-50 border-orange-200';
                badgeClass = 'bg-orange-100 text-orange-700';
                icon = 'fa-chart-line text-orange-600';
            } else if (score < 0) {
                signal = '小幅偏空';
                title = '融資融券略偏保守，留意追價風險';
                summary = '籌碼有些擁擠或分歧，若股價反彈但法人沒有跟上，短線容易震盪。';
                className = 'text-amber-700 bg-amber-50 border-amber-200';
                badgeClass = 'bg-amber-100 text-amber-700';
                icon = 'fa-triangle-exclamation text-amber-600';
            }
            const points = [];
            const compareText = hasPrev ? `相較前一筆資料（${prev.dateLabel || '前一交易日'}）` : '依官方買進/賣出欄位估算';
            if (financeDiff > 0) points.push(`${compareText}，融資增加 ${this.formatCurrency(absFinance)} 張：散戶槓桿籌碼增加，若股價沒有同步轉強，容易偏擁擠。`);
            else if (financeDiff < 0) points.push(`${compareText}，融資減少 ${this.formatCurrency(absFinance)} 張：散戶槓桿籌碼退場，籌碼壓力下降。`);
            else points.push('融資餘額幾乎沒有變化，散戶籌碼暫時中性。');
            if (shortDiff > 0) points.push(`融券增加 ${this.formatCurrency(absShort)} 張：空方籌碼增加，若股價反而走強，後續有軋空可能；若股價轉弱，則偏空確認。`);
            else if (shortDiff < 0) points.push(`融券減少 ${this.formatCurrency(absShort)} 張：空單回補，若股價同步走強，短線支撐較佳。`);
            else points.push('融券餘額變化不大，空方籌碼沒有明顯加壓或回補。');
            if (instNet > 0) points.push(`同日三大法人合計買超 ${this.formatCurrency(instNet)} 張，若融資沒有大增，籌碼較健康。`);
            else if (instNet < 0) points.push(`同日三大法人合計賣超 ${this.formatCurrency(Math.abs(instNet))} 張，若融資仍增加，代表法人與散戶方向相反，需提高警覺。`);
            else points.push('法人方向不明顯，融資融券訊號需搭配技術面確認。');
            return { signal, title, summary, points, className, badgeClass, icon, financeDiff, shortDiff };
        },
        stockRiskRecords() { return Array.isArray(this.stockRiskData?.records) ? this.stockRiskData.records : []; },
        stockRiskSummary() { return this.stockRiskData?.summary || { label: '未查詢', level: 'unknown', className: 'text-slate-600 bg-slate-50 border-slate-200' }; },
        // --- NEW: Analysis Computed Properties ---
        realizedAnalysisList() {
            // Use existing filteredTransactions (so date filter works)
            const realized = this.filteredTransactions.filter(tx => tx.realizedPnL !== null && tx.realizedPnL !== undefined);

            const groups = {};
            realized.forEach(tx => {
                if (!groups[tx.code]) {
                    groups[tx.code] = {
                        code: tx.code,
                        name: tx.name,
                        totalClosedQty: 0,
                        totalClosedBase: 0,
                        totalPnL: 0,
                        weightedExitPriceSum: 0,
                        latestDate: tx.date
                    };
                }
                const closedQty = Number(tx.closedQty ?? tx.qty) || 0;
                const closedBase = Number(tx.closedBase ?? 0) || 0;
                groups[tx.code].totalClosedQty += closedQty;
                groups[tx.code].totalClosedBase += closedBase;
                groups[tx.code].totalPnL += Number(tx.realizedPnL) || 0;
                groups[tx.code].weightedExitPriceSum += (Number(tx.price) || 0) * closedQty;
                if (new Date(tx.date) > new Date(groups[tx.code].latestDate)) groups[tx.code].latestDate = tx.date;
            });

            return Object.values(groups).map(g => {
                const avgExitPrice = g.totalClosedQty > 0 ? g.weightedExitPriceSum / g.totalClosedQty : 0;
                const roi = g.totalClosedBase > 0 ? ((g.totalPnL / g.totalClosedBase) * 100).toFixed(2) : 0;
                return {
                    code: g.code,
                    name: g.name,
                    totalQty: g.totalClosedQty,
                    totalPnL: g.totalPnL,
                    avgPrice: avgExitPrice,
                    roi,
                    latestDate: g.latestDate
                };
            }).sort((a,b) => new Date(b.latestDate) - new Date(a.latestDate));
        },
        realizedDetailTransactions() {
            if (!this.realizedDetailCode) return [];
            // Show all history for this stock to trace P&L source
            return this.sortedTransactions.filter(tx => tx.code === this.realizedDetailCode);
        },
        tradingWinRateStats() {
            const makeDate = (value) => {
                if (!value) return null;
                const d = new Date(String(value).slice(0, 10) + 'T00:00:00');
                return Number.isNaN(d.getTime()) ? null : d;
            };
            const dayDiff = (from, to) => {
                if (!from || !to) return null;
                const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
                const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
                return Math.max(0, Math.round((b - a) / 86400000));
            };
            const avg = (arr) => arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
            const filteredIds = new Set((this.filteredTransactions || []).map(tx => tx && tx.id));
            const ordered = [...(this.portfolioTransactions || [])].filter(tx => tx && tx.code).sort((a, b) => {
                const da = makeDate(a.date)?.getTime() || 0;
                const db = makeDate(b.date)?.getTime() || 0;
                if (da !== db) return da - db;
                return (Number(a.id || 0) - Number(b.id || 0));
            });
            const buyLots = {};
            const completed = [];
            ordered.forEach(tx => {
                const code = String(tx.code || '').trim();
                if (!code) return;
                if (!buyLots[code]) buyLots[code] = [];
                const txDate = makeDate(tx.date);
                const qty = Number(tx.qty) || 0;
                const posQty = Math.max(0, Number(tx.posQty ?? tx.qty) || 0);
                const closedQty = Math.max(0, Number(tx.closedQty) || 0);
                const dayTradeQty = Math.max(0, Math.min(closedQty, Number(tx.dayTradeMatchedQty) || 0));

                if (tx.type === 'buy' && posQty > 0) {
                    buyLots[code].push({ qty: posQty, date: txDate });
                    return;
                }

                if (tx.type !== 'sell') return;
                if (closedQty <= 0) return;

                let holdWeighted = 0;
                let holdQty = 0;
                if (dayTradeQty > 0) {
                    holdQty += dayTradeQty;
                }

                let remain = Math.max(0, closedQty - dayTradeQty);
                const lots = buyLots[code];
                while (remain > 0 && lots.length) {
                    const lot = lots[0];
                    const m = Math.min(remain, Number(lot.qty) || 0);
                    const d = dayDiff(lot.date, txDate);
                    if (d !== null) {
                        holdWeighted += d * m;
                        holdQty += m;
                    }
                    lot.qty -= m;
                    remain -= m;
                    if (lot.qty <= 1e-9) lots.shift();
                }

                const pnl = Number(tx.realizedPnL) || 0;
                const base = Number(tx.closedBase) || 0;
                const inCurrentFilter = filteredIds.has(tx.id);
                if (inCurrentFilter && tx.realizedPnL !== null && tx.realizedPnL !== undefined && base > 0) {
                    completed.push({
                        pnl,
                        rate: (pnl / base) * 100,
                        holdingDays: holdQty > 0 ? (holdWeighted / holdQty) : 0
                    });
                }
            });

            const wins = completed.filter(t => t.pnl > 0);
            const losses = completed.filter(t => t.pnl < 0);
            const totalTrades = completed.length;
            const winCount = wins.length;
            const lossCount = losses.length;
            const avgProfitRate = avg(wins.map(t => t.rate));
            const avgLossRate = avg(losses.map(t => t.rate));
            const avgLossRateAbs = Math.abs(avgLossRate);
            const ratio = avgLossRateAbs > 0 ? (avgProfitRate / avgLossRateAbs) : 0;
            const netPnL = completed.reduce((sum, t) => sum + t.pnl, 0);
            const winBarWidth = totalTrades ? (winCount / totalTrades) * 100 : 0;
            const lossBarWidth = totalTrades ? (lossCount / totalTrades) * 100 : 0;
            return {
                totalTrades,
                winCount,
                lossCount,
                winRate: totalTrades ? ((winCount / totalTrades) * 100).toFixed(1) : '0.0',
                avgHoldingDays: avg(completed.map(t => t.holdingDays)).toFixed(1),
                avgProfitRate: avgProfitRate.toFixed(2),
                avgLossRate: avgLossRate.toFixed(2),
                avgLossRateAbs: avgLossRateAbs.toFixed(2),
                rewardRiskRatio: ratio ? ratio.toFixed(2) : '0.00',
                netPnL,
                winBarWidth,
                lossBarWidth
            };
        },

        monthlyProfitStats() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const lastMonthDate = new Date(year, month - 1, 1);
            const lastYear = lastMonthDate.getFullYear();
            const lastMonth = lastMonthDate.getMonth();
            const makeDate = (value) => {
                if (!value) return null;
                const d = new Date(String(value).slice(0, 10) + 'T00:00:00');
                return Number.isNaN(d.getTime()) ? null : d;
            };
            const realized = (this.portfolioTransactions || []).filter(tx => tx && tx.realizedPnL !== null && tx.realizedPnL !== undefined).map(tx => {
                const d = makeDate(tx.date);
                return { ...tx, _date: d, _pnl: Number(tx.realizedPnL) || 0 };
            }).filter(tx => tx._date);
            const monthsRaw = Array.from({ length: 12 }, (_, i) => ({ key: `${year}-${String(i + 1).padStart(2, '0')}`, label: `${i + 1}月`, pnl: 0 }));
            let thisMonthPnL = 0;
            let lastMonthPnL = 0;
            let yearPnL = 0;
            const yearTrades = [];
            realized.forEach(tx => {
                const y = tx._date.getFullYear();
                const m = tx._date.getMonth();
                if (y === year && m === month) thisMonthPnL += tx._pnl;
                if (y === lastYear && m === lastMonth) lastMonthPnL += tx._pnl;
                if (y === year) {
                    yearPnL += tx._pnl;
                    monthsRaw[m].pnl += tx._pnl;
                    yearTrades.push(tx);
                }
            });
            const profits = yearTrades.map(tx => tx._pnl).filter(v => v > 0);
            const losses = yearTrades.map(tx => tx._pnl).filter(v => v < 0);
            const tradeCount = yearTrades.length;
            const winCount = profits.length;
            const lossCount = losses.length;
            const avg = arr => arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
            const maxAbsMonthPnL = Math.max(0, ...monthsRaw.map(m => Math.abs(m.pnl)));
            const barBase = Math.max(1, maxAbsMonthPnL);
            const months = monthsRaw.map(m => ({
                ...m,
                barHeight: m.pnl === 0 ? 3 : Math.max(8, Math.round((Math.abs(m.pnl) / barBase) * 100))
            }));
            return {
                year,
                thisMonthPnL,
                lastMonthPnL,
                yearPnL,
                tradeCount,
                winCount,
                lossCount,
                winRate: tradeCount ? ((winCount / tradeCount) * 100).toFixed(1) : '0.0',
                avgProfit: avg(profits),
                avgLoss: avg(losses),
                maxProfit: profits.length ? Math.max(...profits) : 0,
                maxLoss: losses.length ? Math.min(...losses) : 0,
                maxAbsMonthPnL,
                months
            };
        },

        // --- Existing Computed ---
        inventoryStickyUpdateLabel() {
            if (this.lastUpdateTimestamp) {
                try {
                    return new Date(this.lastUpdateTimestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
                } catch (_) {}
            }
            const raw = String(this.lastUpdateTime || '').trim();
            if (!raw) return '--';
            const m = raw.match(/(\d{1,2}:\d{2})(?::\d{2})?$/);
            return m ? m[1] : raw;
        },
        priceUpdateAgeMinutes() { if (!this.lastUpdateTimestamp) return null; const diff = Date.now() - this.lastUpdateTimestamp; return diff < 0 ? 0 : Math.floor(diff / 60000); },
        priceUpdateAgeText() { const m = this.priceUpdateAgeMinutes; if (m === null) return ''; if (m < 60) return `${m} 分鐘前`; const h = Math.floor(m / 60); const mm = m % 60; if (h < 24) return mm === 0 ? `${h} 小時前` : `${h} 小時 ${mm} 分鐘前`; const d = Math.floor(h / 24); const hh = h % 24; return hh === 0 ? `${d} 天前` : `${d} 天 ${hh} 小時前`; },
        isPriceUpdateStale() { const m = this.priceUpdateAgeMinutes; return m === null ? false : m >= (this.priceStaleThresholdMinutes || 180); },
        priceUpdateHintLevel() { if (this.lastPriceUpdateError) return 'error'; if (this.lastPriceUpdatePartial && this.lastUpdateTimestamp) return 'partial'; if (!this.lastUpdateTimestamp) return 'never'; if (this.isPriceUpdateStale) return 'stale'; return 'ok'; },
        priceUpdateHintIcon() { const lv = this.priceUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'fa-solid fa-triangle-exclamation'; if (lv === 'ok') return 'fa-solid fa-circle-check'; return 'fa-regular fa-clock'; },
        priceUpdateHintClass() { const lv = this.priceUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'text-amber-700'; if (lv === 'ok') return 'text-emerald-700'; return 'text-slate-500'; },
        priceUpdateHintText() { const lv = this.priceUpdateHintLevel; if (lv === 'never') return '尚未更新股價'; if (lv === 'error') return '，沿用上次價格'; if (lv === 'partial') { const miss = this.lastPriceUpdateMissingCount || 0; return miss > 0 ? `部分更新成功：${miss} 檔未更新（沿用上次價格）` : '部分更新成功（部分資料沿用上次價格）'; } if (lv === 'stale') return `價格（${this.priceUpdateAgeText}）`; if (lv === 'ok') return `價格（${this.priceUpdateAgeText}）`; return ''; },
        globalUpdateAgeMinutes() { if (!this.globalIndicesLastTs) return null; const diff = Date.now() - this.globalIndicesLastTs; return diff < 0 ? 0 : Math.floor(diff / 60000); },
        globalUpdateAgeText() { const m = this.globalUpdateAgeMinutes; if (m === null) return ''; if (m < 60) return `${m} 分鐘前`; const h = Math.floor(m / 60); const mm = m % 60; if (h < 24) return mm === 0 ? `${h} 小時前` : `${h} 小時 ${mm} 分鐘前`; const d = Math.floor(h / 24); const hh = h % 24; return hh === 0 ? `${d} 天前` : `${d} 天 ${hh} 小時前`; },
        isGlobalUpdateStale() { const m = this.globalUpdateAgeMinutes; return m === null ? false : m >= 180; },
        globalUpdateHintLevel() { if (this.globalIndicesError) return 'error'; if (this.globalIndicesPartial && this.globalIndicesLastTs) return 'partial'; if (!this.globalIndicesLastTs) return 'never'; if (this.isGlobalUpdateStale) return 'stale'; return 'ok'; },
        globalUpdateHintIcon() { const lv = this.globalUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'fa-solid fa-triangle-exclamation'; if (lv === 'ok') return 'fa-solid fa-circle-check'; return 'fa-regular fa-clock'; },
        globalUpdateHintClass() { const lv = this.globalUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'text-amber-700'; if (lv === 'ok') return 'text-emerald-700'; return 'text-slate-500'; },
        globalUpdateHintText() { const lv = this.globalUpdateHintLevel; if (lv === 'never') return '尚未更新全球指數（夜）'; if (lv === 'error') return '，沿用上次資料'; if (lv === 'partial') { const miss = this.globalIndicesMissingCount || 0; return miss > 0 ? `部分更新成功：${miss} 檔未更新（沿用上次資料）` : '部分更新成功（部分資料沿用上次資料）'; } if (lv === 'stale') return `指數（${this.globalUpdateAgeText}）`; if (lv === 'ok') return `指數（${this.globalUpdateAgeText}）`; return ''; },
        saveStatusText() { return window.StockSaveStatus.label(this.saveStatus); },
        saveStatusIcon() { return window.StockSaveStatus.icon(this.saveStatus); },
        saveStatusClass() { return window.StockSaveStatus.colorClass(this.saveStatus); },
        saveStatusTitle() { return this.saveStatus && this.saveStatus.errorMessage ? this.saveStatus.errorMessage : '本機即時儲存狀態'; },
        gdriveDefaultClientId() { try { return window.StockBackupService.getDefaultGDriveClientId.call(this); } catch(_) { return ''; } },
        gdriveEffectiveClientId() { try { return window.StockBackupService.getGDriveEffectiveClientId.call(this); } catch(_) { return (this.gdriveClientId || '').trim(); } },
        gdriveClientIdSource() { try { return window.StockBackupService.getGDriveClientIdSource.call(this); } catch(_) { return this.gdriveClientId ? 'custom' : 'none'; } },
        gdriveClientIdStatusText() { const src = this.gdriveClientIdSource; if (src === 'custom') return '使用自訂 Client ID'; if (src === 'default') return '使用網站預設 Client ID'; return '尚未設定 Client ID'; },
        cloudBackupState() {
            if (this.gdriveBusy) return 'busy';
            const meta = this.gdriveCloudMeta || {};
            if (meta.lastCloudErrorAt || meta.lastCloudErrorMessage) return 'error';
            if (!this.gdriveEffectiveClientId) return 'setup';
            const lastUpload = meta.lastCloudUploadAt ? Date.parse(meta.lastCloudUploadAt) : 0;
            if (!lastUpload) return 'localOnly';
            const lastLocal = this.saveStatus && this.saveStatus.lastSavedAt ? Number(this.saveStatus.lastSavedAt) : 0;
            if (lastLocal && lastLocal - lastUpload > 60000) return 'pending';
            const ageDays = (Date.now() - lastUpload) / 86400000;
            if (ageDays >= 3) return 'stale';
            return 'synced';
        },
        cloudBackupNeedsAttention() { return ['setup', 'localOnly', 'pending', 'stale', 'error'].includes(this.cloudBackupState); },
        cloudBackupStatusText() {
            const st = this.cloudBackupState;
            if (st === 'busy') return this.gdriveBusyText || '備份中...';
            if (st === 'synced') return '已同步';
            if (st === 'pending') return '待雲端備份';
            if (st === 'stale') return '建議備份';
            if (st === 'error') return '備份失敗';
            if (st === 'setup') return '雲端未設定';
            return '僅本機';
        },
        cloudBackupStatusSubtext() {
            const st = this.cloudBackupState;
            const meta = this.gdriveCloudMeta || {};
            if (st === 'busy') return 'Google Drive';
            if (st === 'synced') return this.formatCompactDateTime(meta.lastCloudUploadAt) || '本機 + 雲端';
            if (st === 'pending') return '本機較新，點擊備份';
            if (st === 'stale') return this.cloudBackupAgeText || '超過 3 天';
            if (st === 'error') return '點擊重試';
            if (st === 'setup') return '點擊設定';
            return '尚未上傳';
        },
        cloudBackupStatusIcon() {
            const st = this.cloudBackupState;
            if (st === 'busy') return 'fa-solid fa-spinner fa-spin';
            if (st === 'synced') return 'fa-solid fa-cloud-circle-check';
            if (st === 'error') return 'fa-solid fa-triangle-exclamation';
            if (st === 'setup') return 'fa-solid fa-cloud';
            return 'fa-solid fa-cloud-arrow-up';
        },
        cloudBackupStatusClass() {
            const st = this.cloudBackupState;
            if (st === 'busy') return 'bg-blue-50/95 text-blue-700 border-blue-200';
            if (st === 'synced') return 'bg-emerald-50/95 text-emerald-700 border-emerald-200';
            if (st === 'error') return 'bg-red-50/95 text-red-700 border-red-200';
            if (st === 'setup') return 'bg-slate-50/95 text-slate-700 border-slate-200';
            return 'bg-amber-50/95 text-amber-700 border-amber-200';
        },
        cloudBackupAgeText() {
            const ts = this.gdriveCloudMeta && this.gdriveCloudMeta.lastCloudUploadAt ? Date.parse(this.gdriveCloudMeta.lastCloudUploadAt) : 0;
            if (!ts) return '';
            const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
            if (m < 60) return `${m} 分鐘前`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h} 小時前`;
            return `${Math.floor(h / 24)} 天前`;
        },
        cloudBackupStatusTitle() {
            const meta = this.gdriveCloudMeta || {};
            const parts = [
                `狀態：${this.cloudBackupStatusText}`,
                `本機儲存：${this.formatDateTime(this.saveStatus && this.saveStatus.lastSavedAt)}`,
                `雲端上傳：${this.formatDateTime(meta.lastCloudUploadAt)}`,
                `雲端檔案：${this.formatDateTime(meta.cloudFileModifiedTime)}`
            ];
            if (meta.lastCloudErrorMessage) parts.push(`錯誤：${meta.lastCloudErrorMessage}`);
            return parts.join('\n');
        },
        gdriveLastActionLabel() { const a = (this.gdriveCloudMeta && this.gdriveCloudMeta.lastAction) ? this.gdriveCloudMeta.lastAction : ''; if (a === 'upload') return '雲端上傳'; if (a === 'restore') return '雲端回復'; if (a === 'delete') return '雲端刪除'; if (a === 'download') return '本機下載'; return '—'; },
        fullStockMap() { return [...this.baseStockMap, ...this.customStocks]; },
        currentPortfolio() {
            const found = (this.portfolios || []).find(p => p && p.id === this.currentPortfolioId);
            return found || { id: 'main', name: '我的帳戶', kind: 'personal' };
        },
        portfolioTransactions() {
            const pid = this.currentPortfolioId || 'main';
            return (this.transactions || []).filter(tx => (tx && (tx.portfolioId || 'main') === pid));
        },
        portfolioCashBook() {
            const pid = this.currentPortfolioId || 'main';
            return (this.cashBook || []).filter(e => (e && (e.portfolioId || 'main') === pid));
        },
        portfolioProfitAdjustments() {
            const pid = this.currentPortfolioId || 'main';
            return (this.profitAdjustments || []).filter(e => (e && (e.portfolioId || 'main') === pid));
        },
        cashInitialEntry() { return window.StockCashService.cashInitialEntry.call(this); },
        cashInitialCapital() { return window.StockCashService.cashInitialCapital.call(this); },
        cashDepositsTotal() { return window.StockCashService.cashDepositsTotal.call(this); },
        cashWithdrawalsTotal() { return window.StockCashService.cashWithdrawalsTotal.call(this); },
        profitWithdrawalsTotal() { return window.StockCashService.profitWithdrawalsTotal.call(this); },
        profitRestoresTotal() { return window.StockCashService.profitRestoresTotal.call(this); },
        availableRealizedProfit() { return window.StockCashService.availableRealizedProfit.call(this); },
        sortedProfitAdjustments() { return window.StockCashService.sortedProfitAdjustments.call(this); },
        profitWithdrawalCategorySummary() { return window.StockCashService.profitWithdrawalCategorySummary.call(this); },
        cashNetContribution() { return window.StockCashService.cashNetContribution.call(this); },
        cashTradeNet() { return window.StockCashService.cashTradeNet.call(this); },
        cashBalance() { return window.StockCashService.cashBalance.call(this); },
        signedMarketValue() { return window.StockCashService.signedMarketValue.call(this); },
        netAssetValue() { return window.StockCashService.netAssetValue.call(this); },
        cashTotalPnL() { return window.StockCashService.cashTotalPnL.call(this); },
        cashRoiPercent() { return window.StockCashService.cashRoiPercent.call(this); },
        cashTopUpNeeded() { return window.StockCashService.cashTopUpNeeded.call(this); },
        canProceedCashTopUp() { return window.StockCashService.canProceedCashTopUp.call(this); },
        cashLedgerRowsAll() { return window.StockCashService.cashLedgerRowsAll.call(this); },
        cashLedgerRowsDisplayed() { return window.StockCashService.cashLedgerRowsDisplayed.call(this); },
        sortedTransactions() { return [...this.portfolioTransactions].sort((a, b) => (new Date(b.date) - new Date(a.date)) || (Number(b.id || 0) - Number(a.id || 0))); },
        filteredTransactions() { if (this.dateFilterMode === 'all') return this.sortedTransactions; const start = new Date(this.filterStart).setHours(0,0,0,0); const end = new Date(this.filterEnd).setHours(23,59,59,999); return this.sortedTransactions.filter(tx => { const txDate = new Date(tx.date).getTime(); return txDate >= start && txDate <= end; }); },
        displayedHistoryTransactions() { if (this.historyTypeFilter === 'all') return this.filteredTransactions; return this.filteredTransactions.filter(tx => tx.type === this.historyTypeFilter); },
        filteredStats() { return window.StockTradeService.filteredStats.call(this); },
        holdings() { return window.StockTradeService.holdings.call(this); },
        activeHoldingOrderCodes() {
            const pid = this.currentPortfolioId || 'main';
            const order = (this.holdingCardOrder && this.holdingCardOrder[pid]) || [];
            return Array.isArray(order) ? order.map(code => String(code)) : [];
        },
        hasCustomHoldingOrder() { return this.activeHoldingOrderCodes.length > 0; },
        filteredHoldings() {
            const list = this.filter === 'all' ? this.holdings : this.holdings.filter(h => h.category === this.filter);
            return this.applyHoldingCardOrder(list);
        },
        holdingAnalysisCards() {
            const stocks = Array.isArray(this.holdings) ? this.holdings : [];
            const cache = (this.chipCache && this.chipCache.stocks) ? this.chipCache.stocks : {};
            const riskCache = (this.stockRiskCache && this.stockRiskCache.stocks) ? this.stockRiskCache.stocks : {};
            const pctText = (v) => (v == null || !Number.isFinite(Number(v))) ? '-' : `${(Number(v) * 100).toFixed(2)}%`;
            const cards = stocks.map(stock => {
                const code = String(stock.code || '');
                const chip = cache[code] || null;
                const risk = riskCache[code]?.summary || riskCache[code]?.data?.summary || {};
                const summary = chip?.summary || {};
                const latest = summary.latest || (Array.isArray(chip?.institutionalRows) ? chip.institutionalRows[0] : {}) || {};
                const overview = chip?.overview || {};
                const marginRows = Array.isArray(chip?.marginRows) ? chip.marginRows : [];
                const margin = marginRows[0] || {};
                const prevMargin = marginRows[1] || {};
                const price = Number(this.latestPrices?.[code] || stock.currentPrice || 0);
                const avg = Number(stock.buyAvgPrice || 0);
                const roi = Number(stock.roi || 0);
                const instNet = Number(latest.totalNetLots || 0);
                const foreignNet = Number(latest.foreignNetLots || overview.foreignNetLots || 0);
                const total5 = Number(summary.total5 || 0);
                const financeBalance = Number(overview.financeBalance ?? margin.financeBalance ?? 0);
                const shortBalance = Number(overview.shortBalance ?? margin.shortBalance ?? 0);
                let financeDiff = overview.financeDiff;
                if (financeDiff == null && marginRows.length) financeDiff = prevMargin.financeBalance != null ? financeBalance - Number(prevMargin.financeBalance || 0) : Number(margin.financeBuy || 0) - Number(margin.financeSell || 0);
                const dayTradeRatio = Number.isFinite(Number(overview.dayTradeRatio)) ? Number(overview.dayTradeRatio) : null;
                const turnoverRate = Number.isFinite(Number(overview.turnoverRate)) ? Number(overview.turnoverRate) : null;
                const shortMarginRatio = Number.isFinite(Number(overview.shortMarginRatio)) ? Number(overview.shortMarginRatio) : (financeBalance > 0 ? shortBalance / financeBalance : null);
                let score = 0;
                const reasons = [];
                if (chip) {
                    if (chip.error) reasons.push('籌碼來源暫時失敗，先以持股損益與風險資料判讀');
                    else if (chip.partial) reasons.push(chip.partialReason || '籌碼資料不完整，已先用可取得資料判讀');
                    if (instNet > 0) { score += 1; reasons.push(`法人最新買超 ${this.formatCurrency(instNet)} 張`); }
                    else if (instNet < 0) { score -= 1; reasons.push(`法人最新賣超 ${this.formatCurrency(Math.abs(instNet))} 張`); }
                    if (total5 > 0) { score += 1; reasons.push(`近 5 筆法人合計偏買`); }
                    else if (total5 < 0) { score -= 1; reasons.push(`近 5 筆法人合計偏賣`); }
                    if (foreignNet > 0) score += 1;
                    else if (foreignNet < 0) score -= 1;
                    if (financeDiff != null && Number(financeDiff) > 0) { score -= 1; reasons.push(`融資增加 ${this.formatCurrency(Math.abs(Number(financeDiff)))} 張`); }
                    else if (financeDiff != null && Number(financeDiff) < 0) { score += 1; reasons.push(`融資減少 ${this.formatCurrency(Math.abs(Number(financeDiff)))} 張`); }
                    if (dayTradeRatio != null && dayTradeRatio >= 0.5) { score -= 1; reasons.push(`當沖率 ${pctText(dayTradeRatio)} 偏高`); }
                    if (turnoverRate != null && turnoverRate >= 0.1) reasons.push(`周轉率 ${pctText(turnoverRate)} 偏高`);
                    if (shortMarginRatio != null && shortMarginRatio >= 0.2) reasons.push(`券資比 ${pctText(shortMarginRatio)} 偏高`);
                } else {
                    reasons.push('尚未查詢籌碼，建議先按「一鍵查持股」');
                }
                const riskLevel = String(risk.level || '');
                if (riskLevel === 'disposition') { score -= 3; reasons.push('有處置風險標籤'); }
                else if (riskLevel === 'warning' || riskLevel === 'attention') { score -= 2; reasons.push('有注意／異常風險標籤'); }
                if (roi >= 10 && score <= 0) reasons.push('已獲利但籌碼未同步轉強，可考慮分批停利');
                if (roi <= -8 && score < 0) reasons.push('虧損擴大且籌碼偏弱，先控管部位風險');
                if (price && avg) {
                    const gap = (price - avg) / avg;
                    if (gap >= 0.12 && dayTradeRatio != null && dayTradeRatio >= 0.4) reasons.push('股價離成本較遠且短線熱度高，避免追高加碼');
                }
                let signal = '中性觀察', title = '等待方向確認', className = 'border-slate-200 bg-white text-slate-700', badgeClass = 'bg-slate-100 text-slate-700', icon = 'fa-scale-balanced';
                if (score >= 3) { signal = '偏多'; title = '籌碼與持股狀態偏正向'; className = 'border-red-200 bg-red-50 text-red-700'; badgeClass = 'bg-red-100 text-red-700'; icon = 'fa-arrow-trend-up'; }
                else if (score <= -3) { signal = '高風險'; title = '法人或風險訊號偏弱'; className = 'border-emerald-200 bg-emerald-50 text-emerald-700'; badgeClass = 'bg-emerald-100 text-emerald-700'; icon = 'fa-triangle-exclamation'; }
                else if (score > 0) { signal = '小幅偏多'; title = '有些正向訊號'; className = 'border-orange-200 bg-orange-50 text-orange-700'; badgeClass = 'bg-orange-100 text-orange-700'; icon = 'fa-chart-line'; }
                else if (score < 0) { signal = '小幅偏弱'; title = '短線先保守'; className = 'border-amber-200 bg-amber-50 text-amber-700'; badgeClass = 'bg-amber-100 text-amber-700'; icon = 'fa-circle-exclamation'; }
                let action = '觀察量價與法人是否延續，不急著追價。';
                if (score >= 3 && roi < 15) action = '可續抱觀察，回檔不破成本或短均線再評估加碼。';
                if (score >= 3 && roi >= 15) action = '偏多但已有獲利，可分批鎖利，保留核心部位。';
                if (score <= -3 && roi > 0) action = '建議分批停利或提高停損停利線。';
                if (score <= -3 && roi <= 0) action = '避免攤平，先設定停損與減碼條件。';
                return { code, name: stock.name, roi, unrealizedPnL: stock.unrealizedPnL, score, signal, title, action, reasons: reasons.slice(0, 4), className, badgeClass, icon, hasChip: !!chip && !chip.error, hasPartialChip: !!chip?.partial, fetchedAtLabel: chip?.fetchedAtLabel || '', riskLabel: risk.label || '' };
            });
            const defaultSorted = cards.sort((a,b) => a.score - b.score || a.roi - b.roi);
            return this.applyHoldingCardOrder(defaultSorted);
        },
        portfolioRiskRadar() {
            const cards = this.holdingAnalysisCards || [];
            if (!cards.length) return null;
            const highRisk = cards.filter(c => c.signal === '高風險').length;
            const weak = cards.filter(c => c.signal === '小幅偏弱').length;
            const positive = cards.filter(c => c.signal === '偏多' || c.signal === '小幅偏多').length;
            const missing = cards.filter(c => !c.hasChip).length;
            let signal = '中性';
            let title = '持股風險分布尚可';
            let className = 'border-slate-200 bg-white text-slate-700';
            let icon = 'fa-gauge-high';
            if (highRisk > 0 || weak >= Math.ceil(cards.length / 2)) { signal = '需控風險'; title = '部分持股籌碼或風險標籤偏弱'; className = 'border-amber-200 bg-amber-50 text-amber-700'; icon = 'fa-triangle-exclamation'; }
            else if (positive >= Math.ceil(cards.length / 2)) { signal = '偏正向'; title = '多數持股籌碼狀態偏正向'; className = 'border-red-200 bg-red-50 text-red-700'; icon = 'fa-arrow-trend-up'; }
            if (missing === cards.length) { signal = '待查詢'; title = '尚未建立持股籌碼分析'; className = 'border-cyan-200 bg-cyan-50 text-cyan-700'; icon = 'fa-layer-group'; }
            return { signal, title, className, icon, total: cards.length, highRisk, weak, positive, missing };
        },

        themeExposureRows() {
            const totalAsset = Math.max(Math.abs(Number(this.netAssetValue) || 0), 1);
            const map = {};
            (this.holdings || []).forEach(stock => {
                const cat = this.getStockCategory(stock.code);
                const theme = cat.mainTheme || '未分類';
                const price = Number(this.latestPrices?.[stock.code] || stock.currentPrice || stock.buyAvgPrice || 0);
                const marketValue = Math.abs(price * Number(stock.qty || 0));
                if (!map[theme]) map[theme] = { theme, marketValue: 0, unrealizedPnL: 0, realizedPnL: 0, count: 0, stocks: [] };
                map[theme].marketValue += marketValue;
                map[theme].unrealizedPnL += Number(stock.unrealizedPnL || 0);
                map[theme].realizedPnL += Number(stock.realizedPnL || 0);
                map[theme].count += 1;
                map[theme].stocks.push(stock.code);
            });
            return Object.values(map).map(row => ({
                ...row,
                totalPnL: row.unrealizedPnL + row.realizedPnL,
                percent: ((row.marketValue / totalAsset) * 100).toFixed(1),
                barWidth: Math.min(100, Math.max(3, (row.marketValue / totalAsset) * 100))
            })).sort((a, b) => b.marketValue - a.marketValue);
        },
        themePnLRows() {
            return [...(this.themeExposureRows || [])].sort((a, b) => b.totalPnL - a.totalPnL);
        },
        sectorExposureRows() {
            const totalAsset = Math.max(Math.abs(Number(this.netAssetValue) || 0), 1);
            const map = {};
            (this.holdings || []).forEach(stock => {
                const cat = this.getStockCategory(stock.code);
                const sector = cat.sector || '其他';
                const price = Number(this.latestPrices?.[stock.code] || stock.currentPrice || stock.buyAvgPrice || 0);
                const marketValue = Math.abs(price * Number(stock.qty || 0));
                if (!map[sector]) map[sector] = { sector, marketValue: 0, count: 0 };
                map[sector].marketValue += marketValue;
                map[sector].count += 1;
            });
            return Object.values(map).map(row => ({ ...row, percent: ((row.marketValue / totalAsset) * 100).toFixed(1), barWidth: Math.min(100, Math.max(3, (row.marketValue / totalAsset) * 100)) })).sort((a, b) => b.marketValue - a.marketValue);
        },
        themeRiskAlerts() {
            const alerts = [];
            const top = (this.themeExposureRows || [])[0];
            if (top && Number(top.percent) >= 40) alerts.push(`${top.theme} 族群占比 ${top.percent}%，曝險偏高`);
            const electronics = (this.sectorExposureRows || []).find(r => r.sector === '電子');
            if (electronics && Number(electronics.percent) >= 80) alerts.push(`電子股占比 ${electronics.percent}%，類股集中度偏高`);
            (this.themeExposureRows || []).filter(r => r.count >= 3).forEach(r => alerts.push(`${r.theme} 持有 ${r.count} 檔，留意同族群連動風險`));
            return alerts.slice(0, 4);
        },
        categoryManagerTabs() { return [{ key: 'sectors', label: '大類股' }, { key: 'industries', label: '細產業' }, { key: 'themes', label: '題材族群' }]; },
        categoryManagerCurrentLabel() { const tab = (this.categoryManagerTabs || []).find(t => t.key === this.categoryManagerTab); return tab ? tab.label : '題材族群'; },
        categoryManagerPlaceholder() { if (this.categoryManagerTab === 'sectors') return '電子 / 金融 / 傳產'; if (this.categoryManagerTab === 'industries') return 'PCB / 散熱 / 光通訊'; return 'GB300 / BBU / 玻纖布'; },
        categoryManagerItems() { const master = window.StockCategoryService ? window.StockCategoryService.normalizeMaster(this.categoryMaster) : (this.categoryMaster || {}); return Array.isArray(master[this.categoryManagerTab]) ? master[this.categoryManagerTab] : []; },
        totalInvestedCost() { return this.holdings.reduce((sum, h) => sum + (h.investedBase || 0), 0); },
        estimatedMarketValue() { return this.holdings.reduce((sum, h) => { const price = this.latestPrices[h.code] || h.currentPrice || h.buyAvgPrice || 0; return sum + Math.abs(price * h.qty); }, 0); },
        totalUnrealizedPnL() { return this.holdings.reduce((sum, h) => sum + h.unrealizedPnL, 0); },
        totalRealizedPnL() { return this.portfolioTransactions.reduce((sum, tx) => sum + ((tx.realizedPnL !== null && tx.realizedPnL !== undefined) ? Number(tx.realizedPnL) : 0), 0); },
        selectedStockBuys() { if (!this.selectedStock) return []; return this.sortedTransactions.filter(tx => tx.code === this.selectedStock.code && tx.type === 'buy').map(tx => ({ id: tx.id, date: tx.date, qty: tx.qty, price: tx.price, category: tx.category })); }
    },
    watch: {
        transactions: { deep: true, handler() { this.scheduleAutoSave("交易資料"); } },
        cashBook: { deep: true, handler() { this.scheduleAutoSave("現金資料"); } },
        profitAdjustments: { deep: true, handler() { this.scheduleAutoSave("獲利用途"); } },
        portfolios: { deep: true, handler() { this.scheduleAutoSave("帳本"); } },
        currentPortfolioId() { this.scheduleAutoSave("目前帳本"); },
        nameMap: { deep: true, handler() { this.scheduleAutoSave("股票名稱"); } },
        categories: { deep: true, handler() { this.scheduleAutoSave("分類"); } },
        stockCategories: { deep: true, handler() { this.scheduleAutoSave("個股族群"); } },
        categoryMaster: { deep: true, handler() { this.scheduleAutoSave("族群清單"); } },
        settings: { deep: true, handler() { this.scheduleAutoSave("設定"); } },
        customStocks: { deep: true, handler() { this.scheduleAutoSave("自選股"); } },
        latestPrices: { deep: true, handler() { this.scheduleAutoSave("行情"); } },
        latestStatus: { deep: true, handler() { this.scheduleAutoSave("行情狀態"); } },
        lastUpdateTime() { this.scheduleAutoSave("行情時間"); },
        lastUpdateTimestamp() { this.scheduleAutoSave("行情時間"); },
        currentTab() { this.$nextTick(() => this.updateInventoryStickySummaryDocked()); },
        showStockDetails() { this.$nextTick(() => this.updateInventoryStickySummaryDocked()); }
    },
    methods: {

        updateInventoryStickySummaryDocked() {
            try {
                const isInventory = this.isLoggedIn && this.currentTab === 'inventory' && !this.showStockDetails;
                if (!isInventory) { this.inventoryStickySummaryDocked = false; return; }
                const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
                let shouldDock = false;
                if (window.innerWidth >= 768) {
                    const header = document.querySelector('.desktop-header');
                    shouldDock = header ? header.getBoundingClientRect().bottom <= 8 : scrollY > 220;
                } else {
                    shouldDock = scrollY > 12;
                }
                this.inventoryStickySummaryDocked = !!shouldDock;
            } catch (_) {
                this.inventoryStickySummaryDocked = false;
            }
        },

        setHoldingsViewMode(mode) {
            this.holdingsViewMode = mode === 'compact' ? 'compact' : 'detailed';
            localStorage.setItem('tw_stock_holdings_view_mode', this.holdingsViewMode);
        },

        saveHoldingCardOrder(codes) {
            const pid = this.currentPortfolioId || 'main';
            const validCodes = new Set((this.holdings || []).map(h => String(h.code)));
            const cleaned = (Array.isArray(codes) ? codes : []).map(code => String(code)).filter((code, idx, arr) => validCodes.has(code) && arr.indexOf(code) === idx);
            this.holdingCardOrder = { ...(this.holdingCardOrder || {}), [pid]: cleaned };
            try { localStorage.setItem('tw_stock_holding_card_order_v1', JSON.stringify(this.holdingCardOrder)); } catch (_) {}
        },
        applyHoldingCardOrder(list) {
            const arr = Array.isArray(list) ? [...list] : [];
            const order = this.activeHoldingOrderCodes || [];
            if (!order.length) return arr;
            const rank = new Map(order.map((code, idx) => [String(code), idx]));
            return arr.sort((a, b) => {
                const ac = String(a?.code || '');
                const bc = String(b?.code || '');
                const ai = rank.has(ac) ? rank.get(ac) : 999999;
                const bi = rank.has(bc) ? rank.get(bc) : 999999;
                return ai - bi;
            });
        },
        visibleHoldingCodes(scope = 'analysis') {
            const source = scope === 'holdings' ? (this.filteredHoldings || []) : (this.holdingAnalysisCards || []);
            return source.map(item => String(item.code)).filter(Boolean);
        },
        onHoldingCardDragStart(code) {
            this.draggingHoldingCode = String(code || '');
            this.dragOverHoldingCode = '';
        },
        onHoldingCardDragOver(code) {
            const target = String(code || '');
            if (target && target !== this.draggingHoldingCode) this.dragOverHoldingCode = target;
        },
        onHoldingCardDragLeave(code) {
            if (this.dragOverHoldingCode === String(code || '')) this.dragOverHoldingCode = '';
        },
        onHoldingCardDrop(targetCode, scope = 'analysis') {
            const from = this.draggingHoldingCode;
            const to = String(targetCode || '');
            if (!from || !to || from === to) { this.onHoldingCardDragEnd(); return; }
            this.reorderHoldingCards(from, to, scope);
            this.onHoldingCardDragEnd();
        },
        onHoldingCardDragEnd() {
            this.draggingHoldingCode = '';
            this.dragOverHoldingCode = '';
        },
        reorderHoldingCards(fromCode, toCode, scope = 'analysis') {
            const visible = this.visibleHoldingCodes(scope);
            if (!visible.includes(String(fromCode)) || !visible.includes(String(toCode))) return;
            const currentAll = this.activeHoldingOrderCodes.length ? this.activeHoldingOrderCodes : (this.holdingAnalysisCards || []).map(c => String(c.code));
            const visibleSet = new Set(visible);
            const visibleOrdered = currentAll.filter(code => visibleSet.has(code));
            visible.forEach(code => { if (!visibleOrdered.includes(code)) visibleOrdered.push(code); });
            const rest = currentAll.filter(code => !visibleSet.has(code));
            const fromIdx = visibleOrdered.indexOf(String(fromCode));
            const toIdx = visibleOrdered.indexOf(String(toCode));
            if (fromIdx < 0 || toIdx < 0) return;
            const [moved] = visibleOrdered.splice(fromIdx, 1);
            visibleOrdered.splice(toIdx, 0, moved);
            this.saveHoldingCardOrder([...visibleOrdered, ...rest]);
        },
        moveHoldingCardByStep(code, direction, scope = 'analysis') {
            const visible = this.visibleHoldingCodes(scope);
            const idx = visible.indexOf(String(code));
            const next = idx + Number(direction || 0);
            if (idx < 0 || next < 0 || next >= visible.length) return;
            this.reorderHoldingCards(visible[idx], visible[next], scope);
        },
        resetHoldingCardOrder() {
            const pid = this.currentPortfolioId || 'main';
            const next = { ...(this.holdingCardOrder || {}) };
            delete next[pid];
            this.holdingCardOrder = next;
            try { localStorage.setItem('tw_stock_holding_card_order_v1', JSON.stringify(next)); } catch (_) {}
        },

        scheduleAutoSave(scope) {
            window.StockSaveStatus.schedule(this, scope, () => {
                window.StockStorage.saveCoreData(this);
                window.StockStorage.saveSettings(this.settings);
                window.StockStorage.saveMarketData(this);
            });
        },
        saveMarketData(scope = '行情') {
            return window.StockSaveStatus.runSave(this, scope, () => window.StockStorage.saveMarketData(this));
        },
        markSaved(scope = '資料') {
            window.StockSaveStatus.markSaved(this, scope);
        },
        formatCompactDateTime(value) {
            if (!value) return '';
            try {
                const d = new Date(value);
                if (Number.isNaN(d.getTime())) return '';
                const today = new Date();
                const isToday = d.toDateString() === today.toDateString();
                return isToday
                    ? d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
            } catch (_) { return ''; }
        },

        floatingControlClass(type) {
            const hasPos = !!(this.floatingPositions && this.floatingPositions[type]);
            return {
                'is-position-editing': !!this.floatingEditMode,
                'is-custom-positioned': hasPos
            };
        },
        floatingControlStyle(type) {
            const pos = this.floatingPositions && this.floatingPositions[type];
            if (!pos) return {};
            return {
                '--floating-control-x': `${Math.max(0, Number(pos.x) || 0)}px`,
                '--floating-control-y': `${Math.max(0, Number(pos.y) || 0)}px`
            };
        },
        startFloatingPositionEditFromSecurity() {
            this.showSecurityModal = false;
            if (!this.floatingEditMode) {
                this.floatingEditMode = true;
                this.$nextTick(() => this.ensureFloatingControlPositions());
            }
        },
        toggleFloatingEditMode() {
            if (this.floatingEditMode) {
                this.floatingEditMode = false;
                this.saveFloatingControlPositions();
                this.openInfoModal('位置已鎖定', '更新股價按鈕的位置已儲存，之後不會再被拖動。');
                return;
            }
            this.floatingEditMode = true;
            this.$nextTick(() => this.ensureFloatingControlPositions());
        },
        ensureFloatingControlPositions() {
            ['price'].forEach(type => {
                if (this.floatingPositions && this.floatingPositions[type]) return;
                const selector = '.floating-price-update';
                const el = document.querySelector(selector);
                if (!el) return;
                const rect = el.getBoundingClientRect();
                this.setFloatingControlPosition(type, rect.left, rect.top, rect.width, rect.height);
            });
        },
        setFloatingControlPosition(type, x, y, width = 0, height = 0) {
            const pad = 8;
            const maxX = Math.max(pad, window.innerWidth - (width || 160) - pad);
            const maxY = Math.max(pad, window.innerHeight - (height || 56) - pad);
            const next = {
                x: Math.min(Math.max(pad, Math.round(Number(x) || pad)), maxX),
                y: Math.min(Math.max(pad, Math.round(Number(y) || pad)), maxY)
            };
            this.floatingPositions = { ...(this.floatingPositions || {}), [type]: next };
        },
        startFloatingControlDrag(event, type) {
            if (!this.floatingEditMode) return;
            if (!event || !event.currentTarget) return;
            event.preventDefault();
            event.stopPropagation();
            const el = event.currentTarget;
            const rect = el.getBoundingClientRect();
            const current = (this.floatingPositions && this.floatingPositions[type]) ? this.floatingPositions[type] : { x: rect.left, y: rect.top };
            this.floatingDragState = {
                type,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                baseX: Number(current.x) || rect.left,
                baseY: Number(current.y) || rect.top,
                width: rect.width,
                height: rect.height
            };
            this.setFloatingControlPosition(type, current.x, current.y, rect.width, rect.height);
            try { el.setPointerCapture && el.setPointerCapture(event.pointerId); } catch (_) {}
            window.addEventListener('pointermove', this.onFloatingControlDragMove, { passive: false });
            window.addEventListener('pointerup', this.stopFloatingControlDrag, { passive: true });
            window.addEventListener('pointercancel', this.stopFloatingControlDrag, { passive: true });
        },
        onFloatingControlDragMove(event) {
            const st = this.floatingDragState;
            if (!st) return;
            if (event && event.cancelable) event.preventDefault();
            const nextX = st.baseX + ((event && event.clientX) || 0) - st.startX;
            const nextY = st.baseY + ((event && event.clientY) || 0) - st.startY;
            this.setFloatingControlPosition(st.type, nextX, nextY, st.width, st.height);
        },
        stopFloatingControlDrag() {
            if (!this.floatingDragState) return;
            this.floatingDragState = null;
            window.removeEventListener('pointermove', this.onFloatingControlDragMove);
            window.removeEventListener('pointerup', this.stopFloatingControlDrag);
            window.removeEventListener('pointercancel', this.stopFloatingControlDrag);
        },
        saveFloatingControlPositions() {
            try { localStorage.setItem('tw_stock_floating_control_positions_v2', JSON.stringify(this.floatingPositions || {})); } catch (_) {}
        },
        resetFloatingControlPositions() {
            this.floatingPositions = { price: null };
            try { localStorage.removeItem('tw_stock_floating_control_positions_v2'); } catch (_) {}
            this.$nextTick(() => this.ensureFloatingControlPositions());
        },

        handleFloatingPriceClick() { return this.fetchStockPrices(); },
        async handleCloudStatusClick() {
            if (this.gdriveBusy) return;
            if (this.cloudBackupState === 'error' && this.gdriveEffectiveClientId) {
                await this.uploadToGDrive();
                return;
            }
            this.showGDriveModal = true;
        },

        // --- 即時商品期貨查價（第三方小工具：TradingView） ---
        openCommodityModal() {
            this.showCommodityModal = true;
            this.$nextTick(() => {
                this.ensureCommodityWidgets();
            });
        },
        refreshCommodityWidgets() {
            // Clear mount points and re-inject scripts
            const ids = ['tv_quote_gc1', 'tv_quote_si1', 'tv_quote_hg1', 'tv_quote_brn1'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML = '';
                    delete el.dataset.tvInited;
                }
            });
            this.$nextTick(() => this.ensureCommodityWidgets());
        },
        ensureCommodityWidgets() {
            const items = [
                { id: 'tv_quote_gc1', symbol: 'TVC:GOLD' },
                { id: 'tv_quote_si1', symbol: 'TVC:SILVER' },
                { id: 'tv_quote_hg1', symbol: 'CAPITALCOM:COPPER' },
                { id: 'tv_quote_brn1', symbol: 'TVC:UKOIL' },
            ];
            items.forEach(item => {
                const mount = document.getElementById(item.id);
                if (!mount) return;
                if (mount.dataset.tvInited === '1') return;
                this._mountTradingViewSingleQuote(mount, item.symbol);
                mount.dataset.tvInited = '1';
            });
        },
        _mountTradingViewSingleQuote(mountEl, symbol) {
            try {
                mountEl.innerHTML = '';
                const outer = document.createElement('div');
                outer.className = 'tradingview-widget-container';
                const widget = document.createElement('div');
                widget.className = 'tradingview-widget-container__widget';
                outer.appendChild(widget);

                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
                script.async = true;
                script.text = JSON.stringify({
                    symbol,
                    width: '100%',
                    colorTheme: 'light',
                    isTransparent: true,
                    locale: 'zh_TW'
                }, null, 2);

                outer.appendChild(script);
                mountEl.appendChild(outer);
            } catch (e) {
                // Fail silently; UI already has a fallback link.
                console.warn('TradingView widget load failed', e);
            }
        },

        // --- Portfolios: separate books for different purposes / members ---
        initPortfoliosAndMigrate() {
            // Ensure main portfolio exists
            if (!Array.isArray(this.portfolios)) this.portfolios = [];
            const hasMain = this.portfolios.some(p => p && p.id === 'main');
            if (!hasMain) this.portfolios.unshift({ id: 'main', name: '我的帳戶', kind: 'personal', createdAt: new Date().toISOString() });

            // Normalize portfolio objects
            this.portfolios = this.portfolios
                .filter(p => p && typeof p === 'object' && p.id && p.name)
                .map(p => ({ id: String(p.id), name: String(p.name), kind: p.kind || (p.id === 'main' ? 'personal' : 'book'), createdAt: p.createdAt || new Date().toISOString() }));

            // Validate current selection
            if (!this.currentPortfolioId) this.currentPortfolioId = 'main';
            if (!this.portfolios.some(p => p.id === this.currentPortfolioId)) this.currentPortfolioId = 'main';

            // Migration: add portfolioId to legacy transactions
            let changed = false;
            if (Array.isArray(this.transactions)) {
                this.transactions.forEach(tx => {
                    if (!tx || typeof tx !== 'object') return;
                    if (!tx.portfolioId) { tx.portfolioId = 'main'; changed = true; }
                });
            }

            if (Array.isArray(this.profitAdjustments)) {
                this.profitAdjustments.forEach(e => {
                    if (!e || typeof e !== 'object') return;
                    if (!e.portfolioId) { e.portfolioId = 'main'; changed = true; }
                });
            }

            // Persist if needed
            try {
                localStorage.setItem(window.StockStorage.KEYS.portfolios, JSON.stringify(this.portfolios));
                localStorage.setItem(window.StockStorage.KEYS.currentPortfolioId, this.currentPortfolioId);
                if (changed) { localStorage.setItem(window.StockStorage.KEYS.transactions, JSON.stringify(this.transactions)); localStorage.setItem(window.StockStorage.KEYS.profitAdjustments, JSON.stringify(this.profitAdjustments || [])); }
            } catch (_) {}
        },
        openPortfolioModal() { this.newPortfolioName = ''; this.showPortfolioModal = true; },
        selectPortfolio(id) {
            const pid = String(id || 'main');
            if (!this.portfolios.some(p => p.id === pid)) return;
            this.currentPortfolioId = pid;
            localStorage.setItem(window.StockStorage.KEYS.currentPortfolioId, pid);
            // Close any detail view to avoid confusion
            this.showStockDetails = false;
            this.selectedStock = null;
            this.showPortfolioModal = false;
        },
        savePortfolios() {
            localStorage.setItem(window.StockStorage.KEYS.portfolios, JSON.stringify(this.portfolios || []));
            localStorage.setItem(window.StockStorage.KEYS.currentPortfolioId, this.currentPortfolioId || 'main');
        },
        addPortfolio() {
            const name = (this.newPortfolioName || '').trim();
            if (!name) { this.openInfoModal('名稱不可空白', '請輸入帳本名稱。'); return; }
            const id = `book_${Date.now()}`;
            this.portfolios.push({ id, name, kind: 'book', createdAt: new Date().toISOString() });
            this.newPortfolioName = '';
            this.currentPortfolioId = id;
            this.savePortfolios();
            this.saveData(); // ensure localStorage consistent
            this.openInfoModal('', `已新增「${name}」帳本。`);
        },
        deletePortfolio(id) {
            const pid = String(id || '');
            if (!pid || pid === 'main') return;

            const p = (this.portfolios || []).find(x => x.id === pid);
            const name = p ? p.name : pid;
            const count = (this.transactions || []).filter(tx => (tx && (tx.portfolioId || 'main') === pid)).length;

            this.confirmTitle = '刪除帳本';
            this.confirmMessage = count > 0
                ? `確定要刪除「${name}」帳本？\n\n⚠️ 這會同時永久刪除該帳本的 ${count} 筆交易紀錄與持倉，無法復原。`
                : `確定要刪除「${name}」帳本？`;
            this.confirmCallback = () => {
                this.transactions = (this.transactions || []).filter(tx => (tx && (tx.portfolioId || 'main') !== pid));
                this.cashBook = (this.cashBook || []).filter(e => (e && (e.portfolioId || 'main') !== pid));
                this.profitAdjustments = (this.profitAdjustments || []).filter(e => (e && (e.portfolioId || 'main') !== pid));
                this.portfolios = (this.portfolios || []).filter(x => x && x.id !== pid);
                if (!this.portfolios.some(x => x.id === 'main')) this.portfolios.unshift({ id: 'main', name: '我的帳戶', kind: 'personal', createdAt: new Date().toISOString() });
                if (this.currentPortfolioId === pid) this.currentPortfolioId = 'main';
                try { this.recomputeAllTradesAndValidate(); } catch(_) {}
                this.saveData();
                this.openInfoModal('', `已刪除「${name}」帳本。`);
            };
            this.showConfirmModal = true;
        },
        // Clear only current portfolio
        deleteCurrentPortfolioTransactions() {
            const pid = this.currentPortfolioId || 'main';
            const name = (this.currentPortfolio && this.currentPortfolio.name) ? this.currentPortfolio.name : pid;
            this.transactions = (this.transactions || []).filter(tx => (tx && (tx.portfolioId || 'main') !== pid));
            this.saveData();
            this.openInfoModal('已清空', `「${name}」帳本的交易紀錄已成功刪除。`);
        },

        // --- Cash Book (資金流／現金帳) ---
        addCashEntry() { return window.StockCashService.addCashEntry.call(this); },
        deleteCashEntry(id) { return window.StockCashService.deleteCashEntry.call(this, id); },
        profitCategoryLabel(category) { return window.StockCashService.profitCategoryLabel.call(this, category); },
        addProfitAdjustment() { return window.StockCashService.addProfitAdjustment.call(this); },
        deleteProfitAdjustment(id) { return window.StockCashService.deleteProfitAdjustment.call(this, id); },
        deleteCurrentPortfolioCashBookEntries() { return window.StockCashService.deleteCurrentPortfolioCashBookEntries.call(this); },
        triggerClearCashBook() { return window.StockCashService.triggerClearCashBook.call(this); },
        prefillCashTopUp() { return window.StockCashService.prefillCashTopUp.call(this); },
        txTypeLabel(tx) { return window.StockCashService.txTypeLabel.call(this, tx); },
        openRealizedDetail(code) { this.realizedDetailCode = code; this.showRealizedDetail = true; },
        closeRealizedDetail() { this.showRealizedDetail = false; this.realizedDetailCode = ''; },

        // --- Existing Methods (Exactly Preserved) ---
        openStockDetails(stock) { if (!stock || !stock.code) return; this.selectedStock = { code: stock.code, name: stock.name }; this.showStockDetails = true; this.currentTab = 'inventory'; window.scrollTo({ top: 0, behavior: 'smooth' }); },
        closeStockDetails() { this.showStockDetails = false; this.selectedStock = null; },
        openEditBuyModal(row) { if (!row || !row.id) { this.openInfoModal('無法編輯', '找不到這筆買入紀錄的識別碼'); return; } const tx = this.transactions.find(t => t.id === row.id); if (!tx) { this.openInfoModal('無法編輯', '找不到對應的交易紀錄'); return; } if (tx.type !== 'buy') { this.openInfoModal('無法編輯', '目前僅支援編輯「買入」紀錄'); return; } this.editBuyTx = { id: tx.id, date: tx.date, code: tx.code, name: (this.nameMap && this.nameMap[tx.code]) ? this.nameMap[tx.code] : tx.name, price: tx.price, qty: tx.qty, category: tx.category || 'core' }; this.showEditBuyModal = true; },
        closeEditBuyModal() { this.showEditBuyModal = false; this.editBuyTx = { id: null, date: '', code: '', name: '', price: null, qty: 0, category: 'core' }; },
        calcBrokerFee(subTotal) { return window.StockTradeService.calcBrokerFee.call(this, subTotal); },
        calcBrokerTax(subTotal, taxRatePercent) { return window.StockTradeService.calcBrokerTax.call(this, subTotal, taxRatePercent); },
        saveEditedBuy() {
            if (!this.editBuyTx.id || !this.editBuyTx.code || !this.editBuyTx.date || !this.editBuyTx.price || !this.editBuyTx.qty) { this.openInfoModal('資料不完整', '請輸入日期、價格與股數'); return; }
            if (this.editBuyTx.qty <= 0 || this.editBuyTx.price <= 0) { this.openInfoModal('資料不正確', '價格與股數需大於 0'); return; }
            const idx = this.transactions.findIndex(t => t.id === this.editBuyTx.id);
            if (idx === -1) { this.openInfoModal('無法儲存', '找不到對應的交易紀錄'); return; }

            const backup = JSON.parse(JSON.stringify(this.transactions));

            const subTotal = this.editBuyTx.price * this.editBuyTx.qty;
            const fee = this.calcBrokerFee(subTotal);
            this.transactions[idx] = { ...this.transactions[idx], date: this.editBuyTx.date, price: this.editBuyTx.price, qty: this.editBuyTx.qty, category: this.editBuyTx.category, fee, tax: 0, totalAmount: subTotal + fee, realizedPnL: null };

            const ok = this.recomputeAllTradesAndValidate();
            if (!ok) { this.transactions = backup; return; }

            this.saveData();
            this.closeEditBuyModal();
            this.openInfoModal('', '買入紀錄已成功更新。');
        },
        openEditTxModal(tx) { if (!tx || !tx.id) { this.openInfoModal('無法編輯', '找不到這筆交易紀錄'); return; } this.editTx = { id: tx.id, date: tx.date, code: tx.code, name: (this.nameMap && this.nameMap[tx.code]) ? this.nameMap[tx.code] : tx.name, type: tx.type, mode: (tx.mode || 'cash'), price: Number(tx.price), qty: Number(tx.qty), category: tx.category || 'core', dayTradeEligible: !!(tx.dayTradeEligible ?? tx.isDayTrade) }; this.showEditTxModal = true; },
        closeEditTxModal() { this.showEditTxModal = false; this.editTx = { id: null, date: '', code: '', name: '', type: 'buy', mode: 'cash', price: null, qty: 0, category: 'core', dayTradeEligible: false }; },
        saveEditedTxFromHistory() { if (!this.editTx.id || !this.editTx.date || !this.editTx.code || !this.editTx.name) { this.openInfoModal('資料不完整', '請輸入日期、股票代號與名稱'); return; } if (!this.editTx.price || !this.editTx.qty || this.editTx.price <= 0 || this.editTx.qty <= 0) { this.openInfoModal('資料不正確', '價格與股數需大於 0'); return; } const idx = this.transactions.findIndex(t => t.id === this.editTx.id); if (idx === -1) { this.openInfoModal('無法儲存', '找不到對應的交易紀錄'); return; } const backup = JSON.parse(JSON.stringify(this.transactions)); this.transactions[idx] = { ...this.transactions[idx], date: this.editTx.date, code: String(this.editTx.code).trim(), name: String(this.editTx.name).trim(), category: this.editTx.category || this.transactions[idx].category || 'core', price: Number(this.editTx.price), qty: Number(this.editTx.qty), mode: (this.editTx.mode || this.transactions[idx].mode || 'cash'), dayTradeEligible: !!this.editTx.dayTradeEligible }; const ok = this.recomputeAllTradesAndValidate(); if (!ok) { this.transactions = backup; return; } this.saveData(); this.closeEditTxModal(); this.openInfoModal('', '交易紀錄已成功更新。'); },
        
        recomputeAllTradesAndValidate() { return window.StockTradeService.recomputeAllTradesAndValidate.call(this); },
        handleAuthAction() { this.authError = ''; if (!this.authInput.username || !this.authInput.password) { this.authError = '請輸入帳號與密碼'; return; } if (this.authMode === 'setup') { if (this.authInput.password !== this.authInput.confirmPassword) { this.authError = '兩次密碼輸入不一致'; return; } this.securityConfig = { enabled: true, username: this.authInput.username, passwordHash: btoa(this.authInput.password) }; localStorage.setItem(window.StockStorage.KEYS.auth, JSON.stringify(this.securityConfig)); this.isLoggedIn = true; localStorage.setItem(window.StockStorage.KEYS.helpAutoOpen, '1'); this.openInfoModal('設定成功', '您的帳號保護已啟用。'); } else { if (this.authInput.username === this.securityConfig.username && btoa(this.authInput.password) === this.securityConfig.passwordHash) { this.isLoggedIn = true; } else { this.authError = '帳號或密碼錯誤'; } } if (this.isLoggedIn) { if (this.rememberUser) { localStorage.setItem(window.StockStorage.KEYS.savedUsername, this.authInput.username); } else { localStorage.removeItem(window.StockStorage.KEYS.savedUsername); } this.authInput.password = ''; this.authInput.confirmPassword = ''; if (!this.rememberUser) this.authInput.username = ''; const shouldAutoOpenHelp = localStorage.getItem(window.StockStorage.KEYS.helpAutoOpen) === '1'; const hasSeenHelp = localStorage.getItem(window.StockStorage.KEYS.helpSeen) === '1'; if (shouldAutoOpenHelp && !hasSeenHelp) { this.showHelpModal = true; localStorage.setItem(window.StockStorage.KEYS.helpSeen, '1'); localStorage.removeItem(window.StockStorage.KEYS.helpAutoOpen); } } },
        logout() { this.isLoggedIn = false; this.authMode = 'login'; this.showSecurityModal = false; const savedUser = localStorage.getItem(window.StockStorage.KEYS.savedUsername); this.authInput.username = savedUser || ''; this.authInput.password = ''; },
        updateSecurityConfig() { localStorage.setItem(window.StockStorage.KEYS.auth, JSON.stringify(this.securityConfig)); },
        handleChangePassword() { if (!this.changePassInput.old || !this.changePassInput.new) { this.openInfoModal('錯誤', '欄位不可為空'); return; } if (btoa(this.changePassInput.old) !== this.securityConfig.passwordHash) { this.openInfoModal('錯誤', '舊密碼不正確'); return; } this.securityConfig.passwordHash = btoa(this.changePassInput.new); localStorage.setItem(window.StockStorage.KEYS.auth, JSON.stringify(this.securityConfig)); this.changePassInput = { old: '', new: '' }; this.showChangePasswordModal = false; this.openInfoModal('成功', '密碼已變更'); },
        triggerClearAuth() { this.confirmTitle = '清除密碼'; this.confirmMessage = '確定要移除帳號保護嗎？這將會刪除您儲存的登入憑證，下次進入時需重新設定。'; this.confirmCallback = () => { localStorage.removeItem(window.StockStorage.KEYS.auth); localStorage.removeItem(window.StockStorage.KEYS.savedUsername); location.reload(); }; this.showConfirmModal = true; },
        forgotPassword() { if(confirm("您確定要重置應用程式並清除密碼嗎？(交易資料保留，但需重新設定帳號)")) { localStorage.removeItem(window.StockStorage.KEYS.auth); location.reload(); } },
        openInfoModal(title, msg) { this.infoTitle = title; this.infoMessage = msg; this.showInfoModal = true; },
        openContextMenu(e, stock) { if (e && typeof e.preventDefault === 'function') e.preventDefault(); this.contextMenu.visible = true; this.contextMenu.x = e?.clientX ?? 0; this.contextMenu.y = e?.clientY ?? 0; this.contextMenu.stock = stock; this.$nextTick(() => { const el = this.$refs.contextMenuEl; if (!el) return; const padding = 8; const vw = window.innerWidth || 0; const vh = window.innerHeight || 0; const rect = el.getBoundingClientRect(); const maxX = Math.max(padding, vw - rect.width - padding); const maxY = Math.max(padding, vh - rect.height - padding); this.contextMenu.x = Math.min(Math.max(this.contextMenu.x, padding), maxX); this.contextMenu.y = Math.min(Math.max(this.contextMenu.y, padding), maxY); }); },
        closeContextMenu() { this.contextMenu.visible = false; },
        handleGlobalClick(e) { if (!this.contextMenu.visible) return; const el = this.$refs.contextMenuEl; if (!el || !el.contains(e.target)) { this.closeContextMenu(); } },
        setManualStatus(disp, warning) { if (!this.contextMenu.stock) return; const code = this.contextMenu.stock.code; this.latestStatus[code] = { isWarning: warning, disposition: disp }; localStorage.setItem(window.StockStorage.KEYS.priceStatus, JSON.stringify(this.latestStatus)); this.closeContextMenu(); },
        triggerClearHistory() { const name = (this.currentPortfolio && this.currentPortfolio.name) ? this.currentPortfolio.name : (this.currentPortfolioId || 'main'); if (this.portfolioTransactions.length === 0) { this.openInfoModal('無資料', '目前此帳本沒有任何交易紀錄。'); return; } this.confirmTitle = `清空「${name}」紀錄`; this.confirmMessage = `⚠️ 危險操作：您確定要「永久刪除」帳本「${name}」的所有歷史交易紀錄嗎？此動作執行後將無法復原！`; this.confirmCallback = this.deleteAllTransactions; this.showConfirmModal = true; },
        deleteAllTransactions() { this.deleteCurrentPortfolioTransactions(); },
        deleteTransaction(id) { this.confirmTitle = '刪除交易'; this.confirmMessage = '確定要刪除此筆交易紀錄嗎？'; this.confirmCallback = () => { this.transactions = this.transactions.filter(t => t.id !== id); this.saveData(); }; this.showConfirmModal = true; },
        confirmAction() { if (this.confirmCallback) this.confirmCallback(); this.showConfirmModal = false; },
        setDateFilter(mode) {
            this.dateFilterMode = mode;
            const today = new Date();
            const format = d => d.toISOString().split('T')[0];

            if (mode === 'thisMonth') {
                const first = new Date(today.getFullYear(), today.getMonth(), 1);
                this.filterStart = format(first);
                this.filterEnd = format(today);
                return;
            }

            if (mode === 'lastMonth') {
                const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const last = new Date(today.getFullYear(), today.getMonth(), 0);
                this.filterStart = format(first);
                this.filterEnd = format(last);
                return;
            }

            this.filterEnd = format(today);
            if (mode === 'today') this.filterStart = format(today);
            else if (mode === 'yesterday') {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                this.filterStart = format(y);
                this.filterEnd = format(y);
            } else if (mode === 'week') {
                const d = new Date();
                d.setDate(d.getDate() - 6);
                this.filterStart = format(d);
            } else if (mode === 'month') {
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                this.filterStart = format(d);
            } else if (mode === 'all') this.filterStart = '2000-01-01';
        },

        async fetchTaiexFuturesInstitutionalOi() { return window.StockInstitutionalOiService.fetchTaiexFuturesInstitutionalOi.call(this); },
        async queryStockChipData() {
            const payload = await window.StockChipService.queryStockChipData.call(this);
            if (window.StockRiskService) await window.StockRiskService.queryStockRiskData.call(this, this.chipQueryCode);
            return payload;
        },
        async queryAllHoldingChipData() {
            if (!window.StockChipService || !window.StockChipService.queryAllHoldingChipData) return null;
            return window.StockChipService.queryAllHoldingChipData.call(this);
        },
        loadHoldingAnalysis(code) {
            const cleanCode = String(code || '').replace(/\D/g, '').slice(0, 6);
            if (!cleanCode) return;
            this.chipQueryCode = cleanCode;
            if (window.StockChipService && window.StockChipService.loadCachedStockChip) window.StockChipService.loadCachedStockChip.call(this, cleanCode);
            if (window.StockRiskService && window.StockRiskService.loadCachedStockRisk) window.StockRiskService.loadCachedStockRisk.call(this, cleanCode);
            this.showInventoryMarketPanel = true;
        },
        async queryStockRiskData(code) { return window.StockRiskService.queryStockRiskData.call(this, code); },
        loadCachedStockChip(code) { return window.StockChipService.loadCachedStockChip.call(this, code); },
        loadCachedStockRisk(code) { return window.StockRiskService.loadCachedStockRisk.call(this, code); },

        async fetchStockPrices() { return window.StockPriceService.fetchStockPrices.call(this); },
        openYahooIndex() { window.open('https://tw.stock.yahoo.com/future', '_blank', 'noopener'); },
        async fetchGlobalIndices() { return window.StockPriceService.fetchGlobalIndices.call(this); },
        async fetchTaiexNightIndex() { return window.StockPriceService.fetchTaiexNightIndex.call(this); },
        lookupStock() { const term = this.searchText; if (!term) { this.suggestions = []; this.showSuggestions = false; return; } const localResults = this.fullStockMap.filter(s => s.code.startsWith(term) || s.name.includes(term)); this.suggestions = localResults.slice(0, 6); this.showSuggestions = true; const exact = localResults.find(s => s.code === term || s.name === term); if(exact) { this.newTx.code = exact.code; this.newTx.name = exact.name; } if (term.length > 1 && localResults.length < 3) { if (this.searchTimeout) clearTimeout(this.searchTimeout); this.searchTimeout = setTimeout(() => { this.fetchOnlineSuggestions(term); }, 500); } },

        async fetchOnlineSuggestions(query) { return window.StockPriceService.fetchOnlineSuggestions.call(this, query); },
        selectSuggestion(stock) { this.searchText = stock.code + " " + stock.name; this.newTx.code = stock.code; this.newTx.name = stock.name; this.showSuggestions = false; },

        // --- Advanced: cash short check for BUY ---
        _finalizeAddTransaction(txObj, meta, successTitle = '新增成功', successMsg = '交易紀錄已儲存！') {
            const code = meta?.code ? String(meta.code).trim() : String(txObj?.code || '').trim();
            const name = meta?.name ? String(meta.name).trim() : String(txObj?.name || '').trim();
            const price = (meta && meta.price != null) ? Number(meta.price) : Number(txObj?.price || 0);
            const exists = !!meta?.exists;

            // Persist custom stock + last price only when we actually commit the transaction
            if (code) {
                const inMap = (this.fullStockMap || []).some(s => s && s.code === code);
                if (!exists && !inMap && name) {
                    this.customStocks = Array.isArray(this.customStocks) ? this.customStocks : [];
                    this.customStocks.push({ code, name });
                    localStorage.setItem(window.StockStorage.KEYS.customStocks, JSON.stringify(this.customStocks));
                }
                if (price && price > 0) this.latestPrices[code] = price;
            }

            const backup = JSON.parse(JSON.stringify(this.transactions));
            this.transactions.push(txObj);

            const ok = this.recomputeAllTradesAndValidate();
            if (!ok) { this.transactions = backup; return false; }

            this.saveData();
            this.newTx.price = null;
            this.searchText = '';
            this.newTx.dayTradeEligible = false;
            this.showAddModal = false;

            this.openInfoModal(successTitle, successMsg);
            return true;
        },
        openCashShortModal(pendingTx, meta, shortage, currentCash, buyCost) {
            const s = Math.max(0, Math.ceil(Number(shortage) || 0));
            this.pendingCashShortTx = pendingTx || null;
            this.pendingCashShortMeta = meta || null;
            this.cashShortNeeded = s;
            this.cashShortCurrentCash = Number(currentCash) || 0;
            this.cashShortBuyCost = Number(buyCost) || 0;
            this.cashShortTradeDate = String(pendingTx?.date || new Date().toISOString().split('T')[0]);
            const label = `${pendingTx?.code || ''}${pendingTx?.name ? ' ' + pendingTx.name : ''}`.trim();
            this.cashShortTarget = label || (pendingTx?.code || '');
            this.cashShortForm = this.cashShortForm || { amount: null, note: '' };
            this.cashShortForm.amount = s;
            this.cashShortForm.note = (this.cashShortForm.note && String(this.cashShortForm.note).trim()) ? this.cashShortForm.note : `買入前補入金：${pendingTx?.code || ''}`.trim();
            this.showCashShortModal = true;
        },
        cancelCashShortBuy() {
            this.showCashShortModal = false;
            this.pendingCashShortTx = null;
            this.pendingCashShortMeta = null;
            // Keep the trade form values so user can adjust if needed
        },
        confirmTopUpAndProceed() {
            if (!this.pendingCashShortTx) { this.cancelCashShortBuy(); return; }
            const needed = Number(this.cashShortNeeded) || 0;
            const amount = Math.abs(Number(this.cashShortForm?.amount) || 0);
            if (!amount || amount <= 0) { this.openInfoModal('資料不完整', '請輸入入金金額。'); return; }
            if (amount + 1e-9 < needed) { this.openInfoModal('入金不足', `至少需要入金 ${this.formatCurrency(needed)} 才能完成買入。`); return; }

            const pid = this.pendingCashShortTx.portfolioId || (this.currentPortfolioId || 'main');
            const date = this.pendingCashShortTx.date || new Date().toISOString().split('T')[0];
            const note = String(this.cashShortForm?.note || '').trim();

            if (!Array.isArray(this.cashBook)) this.cashBook = [];
            this.cashBook.push({
                id: Date.now(),
                portfolioId: pid,
                date,
                type: 'deposit',
                amount: amount,
                note: note || `買入前補入金：${this.pendingCashShortTx.code || ''}`.trim()
            });

            const txObj = this.pendingCashShortTx;
            const meta = this.pendingCashShortMeta;

            // Close modal BEFORE opening success modal (z-index)
            this.showCashShortModal = false;
            this.pendingCashShortTx = null;
            this.pendingCashShortMeta = null;

            this._finalizeAddTransaction(txObj, meta, '已完成', '已自動入金並完成買入。');
        },

        addTransaction() {
            if (!this.newTx.code || !this.newTx.price || !this.newTx.qty) { this.openInfoModal('資料不完整', '請輸入代碼、價格與股數'); return; }
            const type = (this.newTx.type === 'sell') ? 'sell' : 'buy';
            const code = String(this.newTx.code).trim();
            const name = String(this.newTx.name || (this.nameMap && this.nameMap[code]) || '').trim();
            const price = Number(this.newTx.price);
            const qty = Number(this.newTx.qty);
            if (!price || !qty || price <= 0 || qty <= 0) { this.openInfoModal('資料錯誤', '請輸入正確價格與股數'); return; }

            const exists = (this.fullStockMap || []).find(s => s.code === code) || null;

            const subTotal = price * qty;
            const fee = this.calcBrokerFee(subTotal);

            // 當沖是否成立要看同日配對結果；這裡先以一般稅率估算，最終以 recompute 重新計算為準。
            let tax = 0;
            let totalAmount = subTotal + fee;
            if (type === 'sell') {
                const taxRate = this.settings.taxRate;
                tax = this.calcBrokerTax(subTotal, taxRate);
                totalAmount = subTotal - fee - tax;
            }

            const mode = (this.newTx.mode || 'cash');
            const dayTradeEligible = !!this.newTx.dayTradeEligible;

            const txObj = {
                id: Date.now(),
                portfolioId: (this.currentPortfolioId || 'main'),
                date: this.newTx.date,
                code,
                name: name || (exists ? exists.name : code),
                type,
                mode,
                dayTradeEligible,
                price,
                qty,
                category: this.newTx.category,
                fee,
                tax,
                totalAmount,
                realizedPnL: null
            };

            // Advanced: if BUY (cash) has insufficient cashBalance, ask to top-up.
            if (type === 'buy' && (mode === 'cash' || !mode)) {
                const currentCash = Number(this.cashBalance || 0);
                const shortage = (Number(totalAmount) || 0) - currentCash;
                if (shortage > 0.0001) {
                    this.openCashShortModal(txObj, { code, name: txObj.name, price, exists: !!exists }, shortage, currentCash, totalAmount);
                    return;
                }
            }

            // Commit immediately
            const meta = { code, name: txObj.name, price, exists: !!exists };
            const ok = this._finalizeAddTransaction(txObj, meta, '新增成功', '交易紀錄已儲存！');
            if (ok) {
                // reset form bits (already done in _finalize), keep qty/type/mode/category as user preference
            }
        },

        openSellModal(stock) {
            if (!stock || !stock.code) return;
            // Inventory sell modal is for closing long positions. For shorts, use the top trade form.
            if (Number(stock.qty) <= 0) {
                this.openInfoModal('空單持倉', '此標的是空單（負庫存）。回補請用上方「新增交易紀錄」選買入/回補；要加空請選賣出/做空。');
                return;
            }
                        const defaultModeTx = [...this.transactions].sort((a,b) => (new Date(b.date) - new Date(a.date)) || (Number(b.id||0)-Number(a.id||0)))
                .find(t => t && t.code === stock.code && t.type === 'buy' && ((t.mode === 'margin') || (t.mode === 'cash')));
            const defaultMode = (defaultModeTx && defaultModeTx.mode) ? defaultModeTx.mode : 'cash';
            this.sellTx = {
                date: new Date().toISOString().split('T')[0],
                code: stock.code,
                name: stock.name,
                price: this.latestPrices[stock.code] || stock.currentPrice || null,
                qty: Math.abs(stock.qty),
                maxQty: Math.abs(stock.qty),
                category: stock.category,
                                mode: defaultMode,
                dayTradeEligible: false
            };
            this.showSellModal = true;
        },
        confirmSell() {
            if(!this.sellTx.price || !this.sellTx.qty || this.sellTx.qty <= 0) { this.openInfoModal('資料錯誤', '請輸入正確價格與股數'); return; }
            if(this.sellTx.maxQty && this.sellTx.qty > this.sellTx.maxQty) { this.openInfoModal('庫存不足', '賣出股數不可大於庫存'); return; }

            const subTotal = this.sellTx.price * this.sellTx.qty;
            const fee = this.calcBrokerFee(subTotal);
            // 當沖是否成立要看同日配對結果；這裡先以一般稅率估算，最終以 recompute 重新計算為準。
            const taxRate = this.settings.taxRate;
            const tax = this.calcBrokerTax(subTotal, taxRate);
            const totalAmount = subTotal - fee - tax;

            const backup = JSON.parse(JSON.stringify(this.transactions));
            this.transactions.push({ id: Date.now(), portfolioId: (this.currentPortfolioId || 'main'), date: this.sellTx.date, code: this.sellTx.code, name: this.sellTx.name, type: 'sell', mode: (this.sellTx.mode || 'cash'), dayTradeEligible: !!this.sellTx.dayTradeEligible, price: Number(this.sellTx.price), qty: Number(this.sellTx.qty), category: this.sellTx.category, fee, tax, totalAmount, realizedPnL: null });

            const ok = this.recomputeAllTradesAndValidate();
            if (!ok) { this.transactions = backup; return; }

            this.saveData();
            this.showSellModal = false;
        },
        applyKangHePreset() { this.settings.feeRate = 0.1425; this.settings.discount = 1; this.settings.taxRate = 0.3; this.settings.dayTradeTaxRate = 0.15; this.settings.minFee = 20; },
        saveSettings() { const ok = window.StockSaveStatus.runSave(this, '設定', () => window.StockStorage.saveSettings(this.settings)); if (ok) this.showSettings = false; },
        saveData() { return window.StockSaveStatus.runSave(this, '資料', () => window.StockStorage.saveCoreData(this)); },
        exportData() { const dateStr = new Date().toISOString().split('T')[0]; this.exportFileName = `stock_backup_${dateStr}`; this.backupTab = 'download'; this.restoreFileName = ''; this.restoreFileObject = null; this.showExportModal = true; },
        confirmExport() { return window.StockBackupService.confirmExport.call(this); },
        onRestoreBackupFileChange(e) { return window.StockBackupService.onRestoreBackupFileChange.call(this, e); },
        async confirmRestoreFromBackupFile() { if (!this.restoreFileObject) return; this.restoreBusy = true; try { const file = this.restoreFileObject; const text = await file.text(); let payload; try { payload = JSON.parse(text); } catch (err) { throw new Error('備份檔案不是有效的 JSON 格式。'); } this._applyBackupPayload(payload); this.openInfoModal('還原成功', '已從備份檔案還原資料，將重新整理以套用所有狀態。'); setTimeout(() => window.location.reload(), 600); } catch (e) { this.openInfoModal('還原失敗', `發生未預期錯誤：${e?.message || e}`); } finally { this.restoreBusy = false; } },
        _applyBackupPayload(payload) { return window.StockBackupService._applyBackupPayload.call(this, payload); },
        _readCloudMeta() { return window.StockBackupService._readCloudMeta.call(this); },
        _writeCloudMeta(patch) { return window.StockBackupService._writeCloudMeta.call(this, patch); },
        formatDateTime(ts) { if (!ts) return '—'; const d = new Date(ts); if (isNaN(d.getTime())) return '—'; try { return d.toLocaleString('zh-TW', { hour12: false }); } catch (_) { return d.toLocaleString(); } },
        async refreshGDriveCloudMeta() { return window.StockBackupService.refreshGDriveCloudMeta.call(this); },
        getDefaultGDriveClientId() { return window.StockBackupService.getDefaultGDriveClientId.call(this); },
        getGDriveEffectiveClientId() { return window.StockBackupService.getGDriveEffectiveClientId.call(this); },
        getGDriveClientIdSource() { return window.StockBackupService.getGDriveClientIdSource.call(this); },
        saveGDriveClientId() { return window.StockBackupService.saveGDriveClientId.call(this); },
        clearGDriveClientId() { return window.StockBackupService.clearGDriveClientId.call(this); },
        async _ensureGDriveAccessToken() { return window.StockBackupService._ensureGDriveAccessToken.call(this); },
        _getDeviceId() { return window.StockBackupService._getDeviceId.call(this); },
        _getDeviceName() { return window.StockBackupService._getDeviceName.call(this); },
        _summarizeBackupPayload(payload) { return window.StockBackupService._summarizeBackupPayload.call(this, payload); },
        _decorateBackupPayload(payload) { return window.StockBackupService._decorateBackupPayload.call(this, payload); },
        async _findAllBackupFiles(accessToken) { return window.StockBackupService._findAllBackupFiles.call(this, accessToken); },
        async _findBackupFileId(accessToken) { return window.StockBackupService._findBackupFileId.call(this, accessToken); },
        _buildBackupPayload() { return window.StockBackupService._buildBackupPayload.call(this); },
        async _downloadBackupPayload(accessToken, fileId) { return window.StockBackupService._downloadBackupPayload.call(this, accessToken, fileId); },
        async _deleteDriveFile(accessToken, fileId) { return window.StockBackupService._deleteDriveFile.call(this, accessToken, fileId); },
        async uploadToGDrive() { return window.StockBackupService.uploadToGDrive.call(this); },
        async restoreFromGDrive() { return window.StockBackupService.restoreFromGDrive.call(this); },
        triggerDeleteGDriveBackup() {
            this.confirmTitle = '移除雲端備份';
            this.confirmMessage = '確定要刪除 Google Drive AppDataFolder 內的雲端備份資料嗎？此動作只會移除雲端備份檔，不會刪除目前手機/瀏覽器內的本機資料，但刪除後將無法從雲端回復。';
            this.confirmCallback = () => this.deleteGDriveBackup();
            this.showConfirmModal = true;
        },
        async deleteGDriveBackup() { return window.StockBackupService.deleteGDriveBackup.call(this); },

        getStockCategory(code) {
            if (!window.StockCategoryService) return { sector: '其他', industry: '其他', mainTheme: '未分類', themes: [], source: 'unclassified' };
            return window.StockCategoryService.getCategory(this.stockCategories || {}, code);
        },
        categorySourceLabel(source) {
            return window.StockCategoryService ? window.StockCategoryService.sourceLabel(source) : (source || '');
        },
        categorySourceClass(source) {
            if (source === 'manual') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (source === 'auto') return 'bg-blue-50 text-blue-700 border-blue-200';
            if (source === 'imported') return 'bg-violet-50 text-violet-700 border-violet-200';
            return 'bg-slate-50 text-slate-500 border-slate-200';
        },
        categoryThemeTags(code) {
            const cat = this.getStockCategory(code);
            return (cat.themes || []).filter(t => t && t !== '未分類').slice(0, 4);
        },
        categoryPickerList(tab) {
            const key = this.normalizeCategoryManagerTab ? this.normalizeCategoryManagerTab(tab) : tab;
            const master = window.StockCategoryService ? window.StockCategoryService.normalizeMaster(this.categoryMaster) : (this.categoryMaster || { sectors: [], industries: [], themes: [] });
            const list = Array.isArray(master[key]) ? master[key] : [];
            return list.map(item => String(item || '').trim()).filter(Boolean);
        },
        filteredCategoryPickerOptions(tab, query, limit = 12) {
            const list = this.categoryPickerList(tab);
            const q = String(query || '').trim().toLowerCase();
            const filtered = q ? list.filter(item => item.toLowerCase().includes(q)) : list;
            return filtered.slice(0, limit);
        },
        categoryPickerHasMore(tab, query, limit = 12) {
            const list = this.categoryPickerList(tab);
            const q = String(query || '').trim().toLowerCase();
            const filtered = q ? list.filter(item => item.toLowerCase().includes(q)) : list;
            return filtered.length > limit;
        },
        setCategoryEditField(field, value) {
            if (!this.categoryEditForm || !['sector', 'industry', 'mainTheme'].includes(field)) return;
            this.categoryEditForm[field] = String(value || '').trim();
        },
        ensureCategoryMasterValues(form) {
            const master = window.StockCategoryService ? window.StockCategoryService.normalizeMaster(this.categoryMaster) : (this.categoryMaster || { sectors: [], industries: [], themes: [] });
            const add = (key, value) => {
                const v = String(value || '').trim();
                if (!v) return;
                if (!Array.isArray(master[key])) master[key] = [];
                if (!master[key].includes(v)) master[key].push(v);
            };
            add('sectors', form.sector);
            add('industries', form.industry);
            add('themes', form.mainTheme);
            String(form.themesText || '').split(/[、,，\n]/).forEach(t => add('themes', t));
            this.categoryMaster = master;
        },
        openCategoryModal(stock) {
            if (!stock || !stock.code) return;
            const cat = this.getStockCategory(stock.code);
            this.categoryEditStock = { code: stock.code, name: stock.name };
            this.categoryEditForm = {
                sector: cat.sector || '',
                industry: cat.industry || '',
                mainTheme: cat.mainTheme || '',
                themesText: (cat.themes || []).join('、')
            };
            this.showCategoryModal = true;
        },
        saveCategoryEdit() {
            if (!this.categoryEditStock || !this.categoryEditStock.code) return;
            const form = this.categoryEditForm || {};
            const themes = String(form.themesText || '').split(/[、,，\n]/).map(s => s.trim()).filter(Boolean);
            const category = {
                sector: form.sector || '其他',
                industry: form.industry || '其他',
                mainTheme: form.mainTheme || themes[0] || form.industry || '未分類',
                themes
            };
            this.ensureCategoryMasterValues(Object.assign({}, category, { themesText: themes.join('、') }));
            this.stockCategories = window.StockCategoryService.saveManualCategory(this.stockCategories || {}, this.categoryEditStock.code, category);
            this.saveData();
            this.showCategoryModal = false;
            this.categoryEditStock = null;
        },
        resetCategoryToAuto() {
            if (!this.categoryEditStock || !this.categoryEditStock.code) return;
            const next = { ...(this.stockCategories || {}) };
            delete next[String(this.categoryEditStock.code)];
            this.stockCategories = next;
            const cat = this.getStockCategory(this.categoryEditStock.code);
            this.categoryEditForm = { sector: cat.sector || '', industry: cat.industry || '', mainTheme: cat.mainTheme || '', themesText: (cat.themes || []).join('、') };
            this.saveData();
        },
        openCategoryDbModal() {
            this.categoryDbImportFileName = '';
            this.categoryDbImportFile = null;
            this.showCategoryDbModal = true;
        },
        downloadJsonFile(filename, payload) {
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        exportCategoryDatabase() {
            if (!window.StockCategoryService) return;
            const dateStr = new Date().toISOString().split('T')[0];
            const payload = window.StockCategoryService.buildDatabasePayload(this.stockCategories || {}, this.categoryMaster || {}, { name: '我的台股族群資料庫' });
            this.downloadJsonFile(`tw_stock_category_database_${dateStr}.json`, payload);
            this.openInfoModal('匯出完成', '已下載目前族群資料庫 JSON。');
        },
        downloadHotCategoryDatabase() {
            if (!window.StockCategoryService) return;
            const payload = window.StockCategoryService.HOT_STOCK_CATEGORY_DATABASE_2026;
            this.downloadJsonFile('taiwan_hot_stock_category_database_2026.json', payload);
        },
        onCategoryDbFileChange(e) {
            const file = e && e.target && e.target.files && e.target.files[0];
            this.categoryDbImportFile = file || null;
            this.categoryDbImportFileName = file ? file.name : '';
        },
        async importCategoryDatabase(mode) {
            if (!this.categoryDbImportFile || !window.StockCategoryService) return;
            try {
                const text = await this.categoryDbImportFile.text();
                let payload;
                try { payload = JSON.parse(text); } catch (_) { throw new Error('檔案不是有效 JSON。'); }
                this.applyCategoryDatabasePayload(payload, mode || 'merge');
            } catch (e) {
                this.openInfoModal('匯入失敗', e?.message || String(e));
            }
        },
        applyHotCategoryDatabase(mode) {
            if (!window.StockCategoryService) return;
            this.applyCategoryDatabasePayload(window.StockCategoryService.HOT_STOCK_CATEGORY_DATABASE_2026, mode || 'merge');
        },
        applyCategoryDatabasePayload(payload, mode) {
            if (!window.StockCategoryService) return;
            const result = window.StockCategoryService.mergeDatabase(this.stockCategories || {}, this.categoryMaster || {}, payload, { mode: mode || 'merge', source: 'imported' });
            this.stockCategories = result.stockCategories;
            this.categoryMaster = result.categoryMaster;
            this.saveData();
            this.categoryDbImportFile = null;
            this.categoryDbImportFileName = '';
            this.openInfoModal('族群資料庫已更新', `${mode === 'overwrite' ? '覆蓋' : '合併'}匯入 ${result.importedCount || 0} 檔分類資料。`);
        },
        openCategoryManagerModal() {
            if (window.StockCategoryService) this.categoryMaster = window.StockCategoryService.normalizeMaster(this.categoryMaster);
            this.categoryManagerNewName = '';
            this.showCategoryManagerModal = true;
        },
        categoryManagerFieldForTab(tab) {
            if (tab === 'sectors') return 'sector';
            if (tab === 'industries') return 'industry';
            return 'themes';
        },
        normalizeCategoryManagerTab(tab) {
            return ['sectors', 'industries', 'themes'].includes(tab) ? tab : 'themes';
        },
        addToCategoryMasterList(tab, value) {
            const key = this.normalizeCategoryManagerTab(tab);
            const v = String(value || '').trim();
            if (!v) return false;
            const master = window.StockCategoryService ? window.StockCategoryService.normalizeMaster(this.categoryMaster) : (this.categoryMaster || { sectors: [], industries: [], themes: [] });
            if (!Array.isArray(master[key])) master[key] = [];
            if (!master[key].some(x => String(x).trim().toLowerCase() === v.toLowerCase())) master[key].push(v);
            this.categoryMaster = master;
            this.saveData();
            return true;
        },
        quickAddCategoryMasterItem(tab, value) {
            const added = this.addToCategoryMasterList(tab, value);
            this.openInfoModal(added ? '已加入清單' : '無法加入', added ? `「${String(value || '').trim()}」已加入${this.categoryManagerTabs.find(t => t.key === this.normalizeCategoryManagerTab(tab))?.label || '族群'}清單。` : '請先輸入名稱。');
        },
        quickAddThemesFromEditText() {
            const themes = String(this.categoryEditForm?.themesText || '').split(/[、,，\n]/).map(s => s.trim()).filter(Boolean);
            themes.forEach(t => this.addToCategoryMasterList('themes', t));
            this.openInfoModal('已更新題材清單', `已將 ${themes.length} 個題材加入下拉清單。`);
        },
        addCategoryManagerItem() {
            const name = String(this.categoryManagerNewName || '').trim();
            if (!name) { this.openInfoModal('請輸入名稱', '請先輸入要新增的分類或族群名稱。'); return; }
            this.addToCategoryMasterList(this.categoryManagerTab, name);
            this.categoryManagerNewName = '';
        },
        categoryManagerUsageLabel(item) {
            const target = String(item || '').trim();
            if (!target) return '';
            let count = 0;
            const map = this.stockCategories || {};
            Object.keys(map).forEach(code => {
                const c = map[code] || {};
                if (this.categoryManagerTab === 'sectors' && c.sector === target) count++;
                else if (this.categoryManagerTab === 'industries' && c.industry === target) count++;
                else if (this.categoryManagerTab === 'themes' && (c.mainTheme === target || (Array.isArray(c.themes) && c.themes.includes(target)))) count++;
            });
            return count ? `已套用於 ${count} 檔手動 / 匯入分類` : '尚未套用於手動 / 匯入分類';
        },
        renameCategoryManagerItem(oldName) {
            const oldValue = String(oldName || '').trim();
            if (!oldValue) return;
            const nextValue = window.prompt(`將「${oldValue}」改名為：`, oldValue);
            if (nextValue === null) return;
            const nv = String(nextValue || '').trim();
            if (!nv || nv === oldValue) return;
            const key = this.normalizeCategoryManagerTab(this.categoryManagerTab);
            const master = window.StockCategoryService ? window.StockCategoryService.normalizeMaster(this.categoryMaster) : (this.categoryMaster || { sectors: [], industries: [], themes: [] });
            master[key] = (master[key] || []).map(x => x === oldValue ? nv : x);
            master[key] = window.StockCategoryService ? window.StockCategoryService.uniqueList(master[key]) : Array.from(new Set(master[key]));
            const map = { ...(this.stockCategories || {}) };
            Object.keys(map).forEach(code => {
                const c = { ...(map[code] || {}) };
                if (key === 'sectors' && c.sector === oldValue) c.sector = nv;
                if (key === 'industries' && c.industry === oldValue) c.industry = nv;
                if (key === 'themes') {
                    if (c.mainTheme === oldValue) c.mainTheme = nv;
                    if (Array.isArray(c.themes)) c.themes = c.themes.map(t => t === oldValue ? nv : t);
                }
                map[code] = c;
            });
            if (key === 'sectors' && this.categoryEditForm.sector === oldValue) this.categoryEditForm.sector = nv;
            if (key === 'industries' && this.categoryEditForm.industry === oldValue) this.categoryEditForm.industry = nv;
            if (key === 'themes') {
                if (this.categoryEditForm.mainTheme === oldValue) this.categoryEditForm.mainTheme = nv;
                this.categoryEditForm.themesText = String(this.categoryEditForm.themesText || '').split(/[、,，\n]/).map(t => t.trim() === oldValue ? nv : t).join('、');
            }
            this.categoryMaster = master;
            this.stockCategories = map;
            this.saveData();
        },
        deleteCategoryManagerItem(item) {
            const value = String(item || '').trim();
            if (!value) return;
            const key = this.normalizeCategoryManagerTab(this.categoryManagerTab);
            this.confirmTitle = `刪除${this.categoryManagerCurrentLabel}`;
            this.confirmMessage = `確定要從清單刪除「${value}」嗎？這只會移除下拉選單，不會強制清掉已套用在股票上的標籤。`;
            this.confirmCallback = () => {
                const master = window.StockCategoryService ? window.StockCategoryService.normalizeMaster(this.categoryMaster) : (this.categoryMaster || { sectors: [], industries: [], themes: [] });
                master[key] = (master[key] || []).filter(x => x !== value);
                this.categoryMaster = master;
                this.saveData();
            };
            this.showConfirmModal = true;
        },
        categoryShort(catId) {
            const id = String(catId || '').trim();
            const cats = Array.isArray(this.categories) ? this.categories : [];
            const c = cats.find(x => x && x.id === id);
            if (c) return String(c.shortLabel || c.name || id);
            if (id === 'core') return '主力';
            if (id === 'rotation') return '輪動';
            return id || '其他';
        },
        categoryBarClass(catId) {
            const id = String(catId || '').trim();
            if (id === 'core') return 'bg-blue-500';
            if (id === 'rotation') return 'bg-indigo-500';
            return 'bg-slate-400';
        },
        categoryBadgeClass(catId) {
            const id = String(catId || '').trim();
            if (id === 'core') return 'bg-blue-100 text-blue-700';
            if (id === 'rotation') return 'bg-indigo-100 text-indigo-700';
            return 'bg-slate-100 text-slate-700';
        },
displayNameWithCode(code, fallbackName) {
            const c = String(code || '').trim();
            let n = '';
            try { n = (this.nameMap && c && this.nameMap[c]) ? String(this.nameMap[c]) : String(fallbackName || ''); } catch(_) { n = String(fallbackName || ''); }
            n = String(n || '').replace(/\s+/g, ' ').trim();
            // remove common noisy suffixes
            n = n.replace(/(走勢圖|即時行情|技術分析|討論|個股|公司資料|股價|ETF\s*報價|ETF\s*資訊)/g, '').trim();
            // remove parentheses that are just code like (00916.TW)
                        // remove parentheses that are just code like (00916.TW) or (00991A.TW)
            n = n.replace(/\(\s*[0-9A-Za-z]{4,8}(?:\.(?:TW|TWO))?\s*\)/gi, '').trim();
            // remove raw code tokens (e.g., 00916, 00991A, 00916.TW) that might remain
            if (c) {
                const cRe = new RegExp('\\b' + c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?:\\.(?:TW|TWO))?\\b', 'ig');
                n = n.replace(cRe, '').trim();
            }
            // remove stray trailing numeric token like '50' (from TOP50 / 50) if it's separated
            n = n.replace(/\s+\d{2,3}\s*$/,'').trim();
            // remove TOPxx segment (e.g., TOP50)
            n = n.replace(/\bTOP\s*\d+\b/ig, '').trim();
            // remove plain ETF token
            n = n.replace(/\bETF\b/ig, '').trim();
            n = n.replace(/\s{2,}/g, ' ').trim();
            if (!n) n = c || '—';
            if (!c) return n;
            return `${n}(${c})`;
        },
        displayNameOnly(code, fallbackName) {
            const c = String(code || '').trim();
            let n = '';
            try { n = (this.nameMap && c && this.nameMap[c]) ? String(this.nameMap[c]) : String(fallbackName || ''); } catch(_) { n = String(fallbackName || ''); }
            n = String(n || '').replace(/\s+/g, ' ').trim();
            n = n.replace(/(走勢圖|即時行情|技術分析|討論|個股|公司資料|股價|ETF\s*報價|ETF\s*資訊)/g, '').trim();
            n = n.replace(/\(\s*[0-9A-Za-z]{4,8}(?:\.(?:TW|TWO))?\s*\)/gi, '').trim();
            if (c) {
                const cRe = new RegExp('\\b' + c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?:\\.(?:TW|TWO))?\\b', 'ig');
                n = n.replace(cRe, '').trim();
            }
            n = n.replace(/\s+\d{2,3}\s*$/,'').trim();
            n = n.replace(/\bTOP\s*\d+\b/ig, '').trim();
            n = n.replace(/\bETF\b/ig, '').trim();
            n = n.replace(/\s{2,}/g, ' ').trim();
            if (!n) n = String(fallbackName || '').trim() || c || '—';
            return n;
        },

formatPrice2(val) { const num = Number(val); if (!Number.isFinite(num)) return '0.00'; const fixed = num.toFixed(2); const parts = fixed.split('.'); const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return intPart + '.' + (parts[1] || '00'); },
        formatCurrency(val) { return Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); },
        formatPercentValue(value) { const n = Number(value); if (!Number.isFinite(n)) return "-"; return (n * 100).toFixed(2) + "%"; },
        formatSignedAmountK(val) { const n = Number(val || 0); const sign = n > 0 ? "+" : (n < 0 ? "-" : ""); return sign + this.formatCurrency(Math.abs(n)) + " 千元"; }
    }
}).mount('#app');
