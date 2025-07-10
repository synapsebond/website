import { Download } from 'lucide-react';
import { useState } from 'react'

import style from './MainApp.module.scss'

function MainApp() {
	return (
		<div className={style.container}>
			<div className={style.leftSide}>
				<form>
					<div className={style.tab}>
						<button>Buy</button>
						<button>Sell</button>
					</div>
					<div className={style.innerForm}>
						<div>
							<label htmlFor="token">Token</label>
							<input />
						</div>
						<div>
							<label htmlFor="2ndparty">Trading with</label>
							<input />
						</div>
						<div>
							<label htmlFor="price">Price set</label>
							<input />
						</div>
						<div>
							<label htmlFor="amount">Amount</label>
							<input />
						</div>
					</div>
				</form>
			</div>
			<div>
				{/* <DealTicket /> */}
				<div>
					<Download /> Download
				</div>
			</div>
		</div>
	);
}

export default MainApp;