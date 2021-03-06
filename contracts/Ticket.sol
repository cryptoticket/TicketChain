//pragma solidity ^0.4.4;

contract Ticket 
{
     string public name = "Ticket";
     address public creator = 0x0;

     enum State {
          Created,
          Sold,
          Cancelled
     }
     State public currentState = State.Created;

     function Ticket(string organizer_inn_, string serial_number_, string id_)
     {
          creator = msg.sender;

          // TODO: please check params here
          organizer_inn = organizer_inn_;
          serial_number = serial_number_;
          id = id_;
     }
     
     function setData(uint date_created_, uint price_kop_, bool is_paper_ticket_, 
                     string event_title_, string event_place_, uint event_date_, string event_address_,
                     string row_, string seat_, uint category_,
                     string buyer_name_, uint buying_date_, uint cancelled_date_)
     {
          date_created = date_created_;
          price_kop = price_kop_;
          is_paper_ticket = is_paper_ticket_;

          event_title = event_title_;
          event_place_title = event_place_;
          event_date = event_date_;
          event_place_address = event_address_;

          row = row_;
          seat = seat_;
          ticket_category = category_;

          buyer_name = buyer_name_;
          buying_date = buying_date_;
          cancelled_date = cancelled_date_;
     }

     function setIssuer(string issuer_, string issuer_i_, string issuer_o_, string issuer_ogrnip_, string issuer_a_)
     {
          issuer = issuer_;
          issuer_inn = issuer_i_;
          issuer_ogrn = issuer_o_;
          issuer_ogrnip = issuer_ogrnip_;
          issuer_address = issuer_a_;
     }

     function setOrganizer(string organizer_, string organizer_i_, string organizer_o_, string organizer_ogrnip_, string organizer_a_)
     {
          organizer = organizer_;
          organizer_inn = organizer_i_;
          organizer_ogrn = organizer_o_;
          organizer_ogrnip = organizer_ogrnip_;
          organizer_address = organizer_a_;
     }

     function setSeller(string seller_, string seller_i_, string seller_o_, string seller_ogrnip_, string seller_a_)
     {
          seller = seller_;
          seller_inn = seller_i_;
          seller_ogrn = seller_o_;
          seller_ogrnip = seller_ogrnip_;
          seller_address = seller_a_;
     }

     function getOrganizerInn()constant returns(string out){
          out = organizer_inn;
          return;
     }

     function getId()constant returns(string out){
          out = id;
          return;
     }

     function getSerialNum()constant returns(string out){
          out = serial_number;
          return;
     }

     function getState()constant returns(State out){
          out = currentState;
          return;
     }

     function setState(uint state, uint date){
          if(state==0){
               currentState = State.Created;
          }else if(state==1){
               currentState = State.Sold;
               buying_date = date;
          }else if(state==2){
               currentState = State.Cancelled;
               cancelled_date = date;
          }
     }

// DATA:
     string public serial_number = "";
     string public id = "";
     uint public date_created = 0;
     uint public price_kop = 0;
     bool public is_paper_ticket = false;

     string public issuer = "";
     string public issuer_inn = "";
     string public issuer_ogrn = "";
     string public issuer_ogrnip = "";
     string public issuer_address = "";

     string public event_title = "";
     string public event_place_title = "";
     uint public event_date = 0;
     string public event_place_address = "";

     string public row = "";
     string public seat = "";
     uint public ticket_category = 0;

     string public organizer = "";
     string public organizer_inn = "";
     string public organizer_ogrn = "";
     string public organizer_ogrnip = "";
     string public organizer_address = "";

     string public seller = "";
     string public seller_inn = "";
     string public seller_ogrn = "";
     string public seller_ogrnip = "";
     string public seller_address = "";

     string public buyer_name = "";
     uint public buying_date = 0;
     uint public cancelled_date = 0;

     /// This function is called when someone sends money to this contract directly.
     function() 
     {
          throw;
     }
}

contract TicketLedger {
     mapping (uint => address) tickets;
     mapping (string => address) ticketsBySernum;
     mapping (string => address) ticketsById;

     uint public currentTicketCount = 0;

     function issueNewTicket(string organizer_inn_,string serial_number_,string id_)returns(address out){
          out = new Ticket(organizer_inn_,serial_number_,id_);
          tickets[currentTicketCount] = out;
          ticketsBySernum[serial_number_] = out;
          ticketsById[id_] = out;

          currentTicketCount++;
          return;
     }

     function getTicketCount()constant returns(uint out){
          out = currentTicketCount;
          return;
     }

     function getTicket(uint index) constant returns (address out){
          out = tickets[index];  
          return;
     }

     function getTicketBySernum(string sernum) constant returns (address out){
          out = ticketsBySernum[sernum];  
          return;
     }

     function getTicketById(string id) constant returns (address out){
          out = ticketsById[id];  
          return;
     }

     /// This function is called when someone sends money to this contract directly.
     function() 
     {
          throw;
     }
}
