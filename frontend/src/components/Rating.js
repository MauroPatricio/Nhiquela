import { FaStar } from "react-icons/fa";
import { FaStarHalf } from "react-icons/fa";
import { FaRegStar } from "react-icons/fa";



function Rating(props) {
  const { rating, numReviews, caption } = props;
  return (
    <div className="rating">
      <span>
        {rating>=1? <FaStar/>: rating >= 0.5 ? <FaStarHalf/>: <FaRegStar/> }
       
        {rating>=2? <FaStar/>: rating >= 1.5 ? <FaStarHalf/>: <FaRegStar/> }

        {rating>=3? <FaStar/>: rating >= 2.5 ? <FaStarHalf/>: <FaRegStar/> }

        {rating>=4? <FaStar/>: rating >= 3.5 ? <FaStarHalf/>: <FaRegStar/> }

        {rating>=5? <FaStar/>: rating >= 4.5 ? <FaStarHalf/>: <FaRegStar/> }

       
      </span>

    <br/>

      {caption ? (
        // <span>{caption}</span>'
        ''
      ) : (
        <span>{' ' + numReviews + ' Comentário(s) '}</span>
      )}
    </div>
  );
}

export default Rating;
