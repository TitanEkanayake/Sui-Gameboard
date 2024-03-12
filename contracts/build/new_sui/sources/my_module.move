module new_sui::my_module {
    use std::vector;
    use sui::object::{UID, new, uid_to_address};
    use sui::tx_context::{TxContext};
    use sui::transfer::share_object;
    use sui::dynamic_object_field;

    const EInvalidCoord: u64 = 0;
    // const ESomeOtherErrorCode: u64 = 1;

    struct Place has key, store {
        id : UID
    }

    struct Quadrant has key, store {
        id: UID,
        quadrant_id: u8,
        board: vector<vector<u32>>
    }

    fun make_row(length: u64): vector<u32>{
        // init empty vector
        let row = vector::empty<u32>();
        // append length number of  #ffffff
        let i = 0;
        while(i < length){
            vector::push_back(&mut row, 16_777_215);
            i = i + 1;
        };
        // return vector
        row
    }
    fun make_quadrant_pixels(length: u64): vector<vector<u32>> {
        // init empty vector
        let grid : vector<vector<u32>> = vector::empty<vector<u32>>();
        // append length number of  #ffffffresults of call to make_row length times
        let i = 0;
        while(i < length){
            vector::push_back(&mut grid, make_row(length));
            i = i + 1;
        };
        // return vector
        grid
    }

    fun init(ctx: &mut TxContext){
        // create place object
        let place = Place{
            id: new(ctx)
        };
        // create four quadrants, initialize each pixel grid to white
        
        // place four quarants as dynamic fields qith quadrant id on place
        let i = 0;
        while(i < 4){
            dynamic_object_field::add(
                &mut place.id,
                i,
                Quadrant {
                    id: new(ctx),
                    quadrant_id: i,
                    board: make_quadrant_pixels(200)
                }
            );
            i = i+1;
        };
        // make place shared object
        share_object(place);
    }

    public fun get_quadrant_id(x: u64, y: u64): u8 {
        // return which quadrant x,y falls in
        if (x < 200) {
            if(y < 200){ 0 }else{ 2 }
        } else {
            if(y < 200){ 1 }else{ 3 }
        }
    }

    public fun set_pixel_at(place: &mut Place, x: u64, y: u64, color: u32){
        //assert that x,y is in bounds
        assert!(x < 400 && y < 400,EInvalidCoord);
        // get quadrant id from x,y
        let quadrant_id = get_quadrant_id(x,y);
        // get quadrant from dynamic field object mapping on place
        let quadrant = dynamic_object_field::borrow_mut<u8,Quadrant>(&mut place.id, quadrant_id);
        let pixel: &mut u32 =  vector::borrow_mut(
            vector::borrow_mut(&mut quadrant.board, x % 200), 
            y%200
        );
        // place the pixel in the quadrant
        *pixel =  color;
    }   

    public fun get_quadrants(place: &Place): vector<address>{
        // create a empty vector
        let addresses = vector::empty<address>();
        // iterate from 0,3
        // lookup quadrant in object mapping from quarant id
        // append id of each quadrant to vector
        let i = 0;
        while(i < 4) {
            let quadrant = dynamic_object_field::borrow<u8, Quadrant>(&place.id,i);
            let quadrant_address = uid_to_address(&quadrant.id);
            vector::push_back(&mut addresses,quadrant_address);
            i + i + 1;
        };
        // return vector
        addresses
    }   
}
