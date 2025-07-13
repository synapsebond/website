import { CircleX, Download, Import, Paintbrush, PaintBucket, PaintRoller } from 'lucide-react';
import { useEffect, useRef, useState } from 'react'

import DealTicket from "./DealTicket.jsx";

import style from './MainApp.module.scss'
import { useAccount, useReadContract, useSignMessage, useSignTypedData, WagmiProvider } from 'wagmi';
import { keccak256, toHex } from 'viem';
import { readContracts } from 'wagmi/actions';
import domToImage from 'dom-to-image-more';
import config from '../config.js';

import Arrow from "../assets/arrow.svg"
import Big from 'big.js';

import jsqr from 'jsqr';

Big.DP = 18;
Big.RM = Big.roundDown;

const ERC20_ABI = [
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		inputs: [],
		stateMutability: "view",
		type: "function",
		name: "name",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string",
			},
		],
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address",
			},
		],
		stateMutability: "view",
		type: "function",
		name: "nonces",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256",
			},
		],
	},
	{
		inputs: [],
		name: "version",
		outputs: [{ internalType: "string", name: "", type: "string" }],
		stateMutability: "view",
		type: "function",
	},
];

function MainApp() {
	const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
	const ROUTER_ADDRESS = "0x0000000000000000000000000000000000000123";
	const BASE_CHAIN_ID = 8453;

	const [isBuy, setIsBuy] = useState(true);
	const [token, setToken] = useState('');
	const [tokenName, setTokenName] = useState('Null Token');
	const [tokenSymbol, setTokenSymbol] = useState('NULL');
	const [secondParty, setSecondParty] = useState('0x0000000000000000000000000000000000000000');
	const [price, setPrice] = useState('0.00');
	const [amount, setAmount] = useState('0');
	const [deadline, setDeadline] = useState(Math.floor(Date.now() / 1000) + 86400);
	const [locked, setLocked] = useState(false);

	const [buyerSignature, setBuyerSignature] = useState('');
	const [sellerSignature, setSellerSignature] = useState('');
	const [buyerPermitSignature, setBuyerPermitSignature] = useState('');
	const [sellerPermitSignature, setSellerPermitSignature] = useState('');
	
	const account = useAccount();
	const { signMessage } = useSignMessage();
	const { signTypedData } = useSignTypedData();
	const refToCapture = useRef(null);

	const [moveHint, setMoveHint] = useState(false);
	const [themeNonce, setThemeNonce] = useState(Math.floor(Math.random() * 500));

	const tokenRef = useRef(null);
	const secondPartyRef = useRef(null);
	const priceRef = useRef(null);
	const amountRef = useRef(null);
	const deadlineRef = useRef(null);

	// TODO: Make this to not use generic variable names
	const { data, error } = useReadContract({
		abi: ERC20_ABI,
		address: token,
		functionName: 'name',
		enabled: !!token,
	});

	useEffect(() => {
		if (data) setTokenName(data);
		if (error) console.error('Error fetching token name:', error);
	}, [data, error]);

	const { data: symbolData, error: symbolError } = useReadContract({
		abi: ERC20_ABI,
		address: token,
		functionName: 'symbol',
		enabled: !!token,
	});

	useEffect(() => {
		if (symbolData) setTokenSymbol(symbolData);
		if (symbolError) console.error('Error fetching token symbol:', symbolError);
	}, [symbolData, symbolError]);

	function createDealMessage() {
		const buyer = isBuy ? account.address : secondParty;
		const seller = !isBuy ? account.address : secondParty;
		const initiatedAt = Math.floor(Date.now() / 1000);
		const deadline = initiatedAt + 86400; // 24 hours later
		const message =
			`Buyer: ${buyer}\n` +
			`Seller: ${seller}\n` +
			`For token: ${token}\n` +
			`Price: ${price}\n` +
			`For ${amount} amount of tokens\n` +
			`Initiated at: ${initiatedAt}\n` +
			`With deadline at: ${deadline}`;
		const fullMessage = message;
		return fullMessage;
	}

	function appendPrefix(message) {
		const prefix = `Ethereum Signed Message:\n${message.length}`;
		return prefix + message;
	}

	function hashDeal() {
		const fullMessage = appendPrefix(createDealMessage());
		const hashBuffer = keccak256(toHex(fullMessage));
		return hashBuffer;
	}

	async function signTokenPermit(isBuy, tokenAddress) {
		const contract = {
			address: tokenAddress,
			abi: ERC20_ABI,
		};
		const readResults = await readContracts(config, {
			contracts: [
				{
					...contract,
					functionName: 'name',
				},
				{
					...contract,
					functionName: 'nonces',
					args: [account.address]
				},
				{
					...contract,
					functionName: 'version',
				},
			]
		});
		const [nameResult, nonceResult, versionResult] = readResults;
		const nonce = nonceResult.result;
		const version = versionResult.result;

		console.log(readResults);

		const name = nameResult.result;
		const spender = ROUTER_ADDRESS;
		const value = isBuy ? Big(price).mul(amount).div(Big('1e18')) : Big(amount);
		const deadline = BigInt(Big(Date.now()).div('1000').toFixed(0)) + BigInt('86400'); // 24 hours later

		const domain = {
			name: name,
			version: version,
			chainId: BASE_CHAIN_ID,
			verifyingContract: tokenAddress,
		};

		const types = {
			Permit: [
				{ name: 'owner', type: 'address' },
				{ name: 'spender', type: 'address' },
				{ name: 'value', type: 'uint256' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'deadline', type: 'uint256' },
			],
		};

		const message = {
			owner: account.address,
			spender: spender,
			value: value.toFixed(0),
			nonce: Big(nonce).toFixed(0),
			deadline: deadline.toString()
		};
		signTypedData({
			domain: domain,
			types: types,
			message: message,
			primaryType: 'Permit'
		}, {
			onSuccess(data) {
				if (isBuy) setBuyerPermitSignature(data);
				else setSellerPermitSignature(data);
			},
			onError(error) {
				setLocked(false);
				console.error('Error signing permit:', error);
			}
		});
	}

	function handleFormSubmit(event) {
		event.preventDefault();
		if (locked) {
			alert("Deal locked. You can cancel the deal by using the Reject Deal button.");
			return;
		}
		if (!token || !secondParty || !price || !amount || price == 0 || amount == 0) {
			alert('Please fill in all fields.');
			return;
		}

		const dealMsg = createDealMessage();
		signMessage({
			message: dealMsg
		}, {
			onSuccess(data) {
				setLocked(true);
				if (isBuy) {
					setBuyerSignature(data);
					signTokenPermit(true, USDC_ADDRESS);
				} else {
					setSellerSignature(data);
					signTokenPermit(false, token);
				}
			},
			onError(error) {
				setLocked(false);
				console.error('Error signing deal message:', error);
			}
		});
	}

	function downloadDealTicket() {
		if (refToCapture.current) {
			const scale = 8;
			const options = {
				width: refToCapture.current.offsetWidth * scale,
				height: refToCapture.current.offsetHeight * scale,
				style: {
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
					overflow: 'hidden',
				}
			};
			// TODO: Tidy this hackish shit
			domToImage.toBlob(refToCapture.current, options)
				.then(blob => {
					const link = document.createElement('a');
					link.href = URL.createObjectURL(blob);
					const now = new Date();
					const pad = n => n.toString().padStart(2, '0');
					const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
					link.download = `deal_ticket_${formattedDate}.png`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
				})
				.catch(error => {
					console.error('Error downloading deal ticket:', error);
				});
		}
	}

	// TODO: Modularise this
	function handleImport(e) {
		// scan qr code
		const file = e.target.files[0];
		// convert to data URI
		const reader = new FileReader();
		reader.onload = async function(event) {
			const img = new Image();
			img.onload = async function() {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

				// Convert to black and white
				for (let i = 0; i < imageData.data.length; i += 4) {
					const r = imageData.data[i];
					const g = imageData.data[i + 1];
					const b = imageData.data[i + 2];
					// Luminance formula
					const gray = 0.299 * r + 0.587 * g + 0.114 * b;
					const bw = gray > 128 ? 255 : 0;
					imageData.data[i] = bw;
					imageData.data[i + 1] = bw;
					imageData.data[i + 2] = bw;
				}
				ctx.putImageData(imageData, 0, 0);

				const bwImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const code = jsqr(bwImageData.data, canvas.width, canvas.height);
				if (!code) {
					alert("No QR code found in the image.");
					return;
				}
				const content = code.data;
				// parse into JSON
				const data = JSON.parse(content);
				console.dir(data);
				
				if (data.buyer == account.address) {
					setIsBuy(true);
				} else if (data.seller == account.address) {
					setIsBuy(false);
				} else {
					alert("This order is not for you.");
					return;
				}

				// Convert unix timestamp to "YYYY-MM-DDTHH:MM" format for input
				const deadlineDate = new Date(data.deadline * 1000);
				const pad = n => n.toString().padStart(2, '0');
				const formattedDeadline = `${deadlineDate.getFullYear()}-${pad(deadlineDate.getMonth() + 1)}-${pad(deadlineDate.getDate())}T${pad(deadlineDate.getHours())}:${pad(deadlineDate.getMinutes())}`;

				tokenRef.current.value = data.token;
				secondPartyRef.current.value = data.buyer == account.address ? data.seller : data.buyer;
				priceRef.current.value = Big(data.price).div(1e6);
				amountRef.current.value = Big(data.amount).div(1e18);

				setToken(data.token);
				setSecondParty(data.buyer == account.address ? data.seller : data.buyer);
				setPrice(data.price);
				setAmount(data.amount);

				deadlineRef.current.value = formattedDeadline;
				setDeadline(data.deadline);

				setBuyerSignature(data.buyerSignature);
				setSellerSignature(data.sellerSignature);
				setBuyerPermitSignature(data.buyerPermitSignature);
				setSellerPermitSignature(data.sellerPermitSignature);

				setThemeNonce(data.themeNonce);
			};
			img.src = event.target.result;
		};
		reader.readAsDataURL(file);
	}

	function importDealTicket() {
		// open select file modal
		const inp = document.createElement('input');
		inp.type = 'file';
		inp.addEventListener('change', handleImport);
		inp.click();
	}

	return (
		<div className={style.container}>
			{!account.isConnected &&
				<div className={style.overlay}>
					<span>Please connect your wallet first.</span>
				</div>
			}
			<div className={style.leftSide}>
				<form onSubmit={handleFormSubmit}>
					<div className={style.tab}>
						<button
							type="button"
							className={isBuy ? style.active : ''}
							onClick={() => !locked ? setIsBuy(true) : null}
						>
							Buy
						</button>
						<button
							type="button"
							className={!isBuy ? style.active : ''}
							onClick={() => !locked ? setIsBuy(false) : null}
						>
							Sell
						</button>
					</div>
					<div className={style.innerForm}>
						<div>
							<label htmlFor="token">Token</label>
							<input
								id="token"
								ref={tokenRef}
								onChange={e => setToken(e.target.value)}
								placeholder='0x0000000000000000000000000000000000000000'
								disabled={locked}
							/>
						</div>
						<div>
							<label htmlFor="2ndparty">Trading with</label>
							<input
								id="2ndparty"
								ref={secondPartyRef}
								onChange={e => setSecondParty(e.target.value)}
								placeholder='0x0000000000000000000000000000000000000000'
								disabled={locked}
							/>
						</div>
						<div>
							<label htmlFor="price">Price set</label>
							<input
								id="price"
								ref={priceRef}
								onChange={e => setPrice((BigInt(Big(e.target.value).mul(Big(1e6)).toFixed(0))))}
								placeholder='0.00'
								disabled={locked}
							/>
						</div>
						<div>
							<label htmlFor="amount">Amount</label>
							<input
								id="amount"
								ref={amountRef}
								onChange={e => setAmount((BigInt(Big(e.target.value).mul(Big(1e18)).toFixed(0))))}
								placeholder='1000'
								disabled={locked}
							/>
						</div>
						<div>
							<label htmlFor="deadline">Deadline</label>
							<input
								id="deadline"
								type="datetime-local"
								ref={deadlineRef}
								disabled={locked}
								defaultValue={new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 16)}
								onChange={e => {
									const date = new Date(e.target.value);
									const deadline = Math.floor(date.getTime() / 1000);
									setDeadline(deadline);
								}}
							/>
						</div>
					</div>
					<button type="submit" className={style.submitButton + ' ' + (isBuy ? style.buttonBuy : style.buttonSell)}>
						{
							locked ?
								"DEAL LOCKED"
								:
								"Sign the deal"
						}
					</button>
				</form>
			</div>
			<div className={style.dealTicket}>
				<DealTicket ref={refToCapture}
					isBuy={isBuy}
					tokenName={tokenName}
					token={token}
					tokenSymbol={tokenSymbol}
					secondParty={secondParty}
					price={price}
					amount={amount}
					deadline={deadline}
					buyerSignature={buyerSignature}
					sellerSignature={sellerSignature}
					buyerPermitSignature={buyerPermitSignature}
					sellerPermitSignature={sellerPermitSignature}
					themeNonce={themeNonce}
					account={account}
				/>
				<div className={style.dealTicketFooter}>
					<div onClick={downloadDealTicket}>
						<Download strokeWidth={'1.5px'} size={18} /> Download
					</div>
					<div onClick={importDealTicket}>
						<Import strokeWidth={'1.5px'} size={18} /> Import Deal
					</div>
					<div>
						<CircleX strokeWidth={'1.5px'} size={18} /> Reject Deal
					</div>
					<div className={style.randomTheme} onMouseOver={() => setMoveHint(true)} onMouseLeave={() => setMoveHint(false)} onClick={() => setThemeNonce(Math.floor(Math.random() * 500))}>
						<Paintbrush strokeWidth={'1.5px'} size={18} />
					</div>
					<div className={style.randomThemeHint + ' ' + (moveHint ? style.randomThemeHintMove : '')}>
						<img src={Arrow} />
						{/* <span>{";)"}</span> */}
					</div>
				</div>
			</div>
		</div>
	);
}

export default MainApp;