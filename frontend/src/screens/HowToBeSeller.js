import React, { useEffect } from 'react'

export default function HowToBeSeller() {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
    return (
      <div style={{ textAlign: 'center'}}>
         <img 
              className='howitworks'
              src="images/sellerhowtoregister.png" 
              alt="Como comprar no site" ></img>    
        
      </div>
      )
}
