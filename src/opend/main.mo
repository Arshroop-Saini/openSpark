import Cycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";
import NFTActorClass "../nft/nft";
import Principal "mo:base/Principal";
import HashMap  "mo:base/HashMap";
import List "mo:base/List";
import Iter "mo:base/Iter";


actor OpenD {
    // Creating our own custom datatype for listing's hashmap to store the the info of the listed NFTs
    private type Listing={
        itemOwner: Principal;
        itemPrice: Nat;
    }

    // Storing all the number of NFTs that are minted on the site and users that have minted them using hashmap datatype.
    // Principal.equal is used to check the equality of the Pricipal id that has been passed in with the one present inside the HashMap. Principal.hash is used to has the principal id or the key;
    var mapOfNFTs = HashMap.HashMap<Principal, NFTActorClass.NFT>(1, Principal.equal, Principal.hash);
    var mapOfOwners = HashMap.HashMap<Principal, List.List<Principal>>(1, Principal.equal, Principal.hash);
    var mapOfListings = HashMap.HashMap<Principal, Listing>(1, Principal.equal, Principal.hash);

    // passing msg in shared so that we can capture who called the function. It stores the principal id of the user.
    // taking in imgData and name as an input
    // asyn returning principal id of the newly created canister. 
    public shared(msg) func mint(imgData: [Nat8], name: Text): async Principal {
        // using that msg caller
        let owner: Principal = msg.caller;
        // Checking the Cycles left.
        Debug.print(debug_show(Cycles.balance()));
        // Addding some cycles for creating the nft canister. It costs 100 billon cycles to add a new canister.
        Cycles.add(100_500_000_000);
        // Calling the NFT function inside nft.mo and passing in the req func input and creating the nft.
        let newNFT= await NFTActorClass.NFT(name,owner,imgData);
        // Getting hold of the principal id of the newly minted NFT. 
        let newNFTPrincipal= await newNFT.getCanisterId();
        // Adding the newly minted NFTs principal id to the hash of NFTs
        mapOfNFTs.put(newNFTPrincipal, newNFT);
        // calling the addToOwnershipMap func and then passing the inputs.
        addToOwnershipMap(owner,newNFTPrincipal);
        // returning the canister id as an output.
        return newNFTPrincipal
    };
    
    private func addToOwnershipMap(owner: Principal, nftId: Principal){
        // If there already exists any NFT of list of NFTs for a particular user (Principal id), then save that into ownedNFTs otherwise save nil in teh ownedNFTs list.
        // Future me: remember that list.list<Principal> is the datatype of ownedNFTs variable. and the value is defined by the switch statement.
        var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(owner)){
            case null List.nil<Principal>();
            case (?result) result;
        };
        // reassigning ownedNFTs with prev NFTs + pushing the newly minted one into the list.
        ownedNFTs := List.push(nftId,ownedNFTs);
        mapOfOwners.put(owner, ownedNFTs);
    };

    public query func getOwnedNFTs(user: Principal) : async [Principal]{
            var userNFTs : List.List<Principal> = switch (mapOfOwners.get(user)){
            case null List.nil<Principal>();
            case (?result) result;
        };
        return List.toArray(userNFTs);
    };

    // Grabbing hold of the Principal ids of all the NFT's and then returning it in order to render on the frontend.
    public query func getListedNFTs(): async [Principal]{
       let ids= Iter.toArray(mapOfListings.keys());
       return ids;
    };


    // Creating the NFT listing function. Taking in Principal id of the NFT and price as input.
    public shared(msg) func listItem(id: Principal, price: Nat){
        var item: NFTActorClass.NFT = switch (mapOfNFTs.get(id)){
            case null return "NFT does not exist.";
            case (?result) result;
        };
        // fetching the owner of the NFT with principal id taken as input.
        let owner= await item.getOwner();
        // Checkig if the person who is calling the function for listing the NFT is the actual user by comparing with the owner fetched.
        if (Principal.equal(owner,msg.caller)){
            // Creating a new listing
            let newListing: Listing ={
                itemOnwer= owner;
                itemPrice= price;
            };
            // Adding the newly listed NFT to the listing HashMap.
            mapOfListings.put(id,newListing);
            return "Success";
        }else{
            return "You don't own the NFT.";
        };
        
    };

    public query func getOpenDCanisterID() : async Principal{
        return Principal.fromActor(OpenD);
    };

    public query func isListed(id: Principal) : async Bool {
      if (mapOfListings.get(id) == null) {
        return false;
      } else{
        return true;
      }
    };

    public query func getOriginalOwner(id: Principal) : async Principal {
      var listing : Listing = switch (mapOfListings.get(id)) {
        case null return Principal.fromText("");
        case (?result) result;
      };

      return listing.itemOwner;
    };

    public query func getListedNFTPrice(id: Principal) : async Nat {
      var listing : Listing = switch (mapOfListings.get(id)) {
        case null return 0;
        case (?result) result;
      };

      return listing.itemPrice;

    };

    // Initiating what happens after the user clicks on buy button.
    public shared(msg) func completePurchase(id: Pricipal, ownerId: Principal, newOwnerId:Principal): async Text{
        var purchasedNFT: NFTActorClass.NFT = switch (mapOfNFTs.get(id)){
            case null return "NFT does not exist.";
            case (?result) result;
        };
        // Transferring the ownership of the NFT.
        let transferResult = await purchasedNFT.transferOwnership(newOwnerId);
        if (transferResult == "Success"){
            mapOfListings.delete(id);
            var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(ownerId)){
                case null List.nil<Principal>();
                case (?result) result;
            };
            // Deleting the sold NFT from the original owner's ownedNFTs.
            ownedNFTs := List.filer(ownedNFTs, func (listItemId: Principal) : Bool {
                return listItemId != id;
            });

            // Adding the NFTs ownership to the newOwners id in our HashMap.
            addToOwnershipMap(newOwnerId, id);
            return "Success";
        }else {
            return "Error";
        }
    };

};
