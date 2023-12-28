import React, { useEffect } from 'react'

export default function Help() {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div style={{ textAlign: 'center'}}>
       <img 
            className='howitworks'
            src="images/nhiquelaCompras.png" 
            alt="Como comprar no site" ></img>    
            
      
    </div>
  )
}
