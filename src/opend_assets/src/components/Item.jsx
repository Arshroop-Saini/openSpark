import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { Principal } from "@dfinity/principal";
import { opend } from "../../../declarations/opend";
import Button from "./Button";
import { idlFactory as tokenIdlFactory} from "../../../declarations/token";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {
  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [image, setImage] = useState();
  const [button, setButton]= useState();
  const [priceInput, setPriceInput]= useState();
  const [loaderHidden, setLoaderHidden] = useState(true);
  const [blur, setBlur] = useState();
  const [sellStatus, setSellStatus] = useState("");
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState();

  // Getting the canister id so that we can use it to call the funcitons defiend in that canister to fetch data regarding the NFT.
  const id = props.id;

  // In order to get acces to that canister we need to make an HTTP request, and use an httpAgent in order to fetch that canister on the internet computer blockchain, in case of working locally it will be our local dfx.

  // Defining the agent that we would use to make an http request to the canister to fetch data and use that data to create the canister on the blockchian. In this case our agent is our localhost.
  const localHost = "http://localhost:8080/";
  const agent = new HttpAgent({ host: localHost });
  // Caution future Arshroop: When deploy live, remove line 25:
  agent.fetchRootKey();
  let NFTActor;

  async function loadNFT() {
    // Creating an actor
    // idlFactor acts as a translator that would help javascript (frontend) understand which methods and functions can be called from the canister (backend) that we are getting hold of using our httpAgent.
    NFTActor = await Actor.createActor(idlFactory, {
      // defining the agent that would make a http req
      agent,
      // defining the id of the cansiter where the req is being made for fetching data in order to  use its functions.
      canisterId: id,
    });

    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(
      new Blob([imageContent.buffer], { type: "image/png" })
    );

    setName(name);
    setOwner(owner.toText());
    setImage(image);
    /* 
    Logic of the UI/UX: 
    There are two pages: discover and collections. 
    ***** If user is on collections page then there would be two possibilites- 
    1. he/she owns the NFT and listed it for sale
    2. he/she owns the NFT and didn't listed it for sale
    
    if the 1st is true then: NFT would be blurred, owner= opend, sell button disappeared.
    if the 2nd is ture then: NFT would not change and there would be a sell button.
    
    **** If the user is on discover page the there would be 2 possibilities again-
    1. he/she owns the NFT.
    2. he/she don't owns the NFT.

    if the 1st is true then: there would be no buy button. the price of the NFT would be there.
    if the 2nd is ture then: No changes to the NFT card would be there and there would be a buy button.


    */
    if (props.role == "collection") {
      const nftIsListed = await opend.isListed(props.id);

      if (nftIsListed) {
        setOwner("OpenD");
        setBlur({ filter: "blur(4px)" });
        setSellStatus("Listed");
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }
    } else if (props.role == "discover") {
      const originalOwner = await opend.getOriginalOwner(props.id);
      if (originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text={"Buy"} />);
      }

      const price = await opend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
    }
  }

  // Calling the loadNFT function only once when the component gets rendered.
  useEffect(() => {
  loadNFT();
  }, []);

let price;   
  function handleSell() {
    console.log("Sell clicked");
    setPriceInput(
      <input
        placeholder="Price in SPARK"
        type="number"
        className="price-input"
        value={price}
        onChange={(e)=> price=(e.target.value)}
      />
    );
    setButton(<Button handleClick={sellItem} text={"Confirm"} />);
  }
  
  async function sellItem() {
    console.log("Confirm Clicked");
    const listingResult= await opend.listItem(props.id, Number(price));
    console.log("Listing: " + listingResult);
    if(listingResult == "Success"){
      const openDId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwnership(openDId)
      console.log("transfer: " + transferResult);
      if (transferResult == "Success") {
        setLoaderHidden(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
        setSellStatus("Listed");
      }
    }
  }

  async function handleBuy() {
    console.log("Buy was triggered");
    setLoaderHidden(false);
    // Fetching the token Actor using the predefined HTTP Agent to request the specified token id of the token canister. 
    const tokenActor = await Actor.createActor(tokenIdlFactory,{
      agent,
      canisterId: Principal.fromText("xyz")
    })

    const sellerId = await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);

    // Using the transfer function defined inside the token Actor.
    const result = await tokenActor.transfer(sellerId, itemPrice);
    if (result == "Success"){
      const transferResult = await opend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
      console.log("purchase: " + transferResult);
      setLoaderHidden(true);
      setDisplay(false);
    }
  }

  return (
    <div style={{display: shouldDisplay ? "inline" : "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
          <div className="lds-ellipsis" hidden={loaderHidden}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
        {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}
            <span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
