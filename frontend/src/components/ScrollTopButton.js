import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import {FaAngleUp } from "react-icons/fa";



export default function ScrollTopButton(props) {
  const [showButton, setShowButton] = useState(false);

  const handleScroll = () => {
    if (window.scrollY > 200) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  const handleScrollToTop = () => {
    window.scrollTo(0, 0); 
  };
 

  return (
    <div >
  
        <>
          {/* <Button
            className={`scroll-to-top-button ${showButton ? 'show' : 'hide'}`}
            type="button"
            onClick={handleScrollToTop}
          >
            <FaAngleUp />
          </Button> */}
        </>
      
    </div>
  );
}
