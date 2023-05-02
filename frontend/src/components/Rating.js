import { faStar } from '@fortawesome/free-solid-svg-icons';
import { faStarHalf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStarOfDavid } from '@fortawesome/free-solid-svg-icons';

function Rating(props) {
  const { rating, numReviews, caption } = props;
  return (
    <div className="rating">
      <span>
        <FontAwesomeIcon
          icon={
            rating >= 1 ? faStar : rating >= 0.5 ? faStarHalf : faStarOfDavid
          }
        />
        <FontAwesomeIcon
          icon={
            rating >= 2 ? faStar : rating >= 1.5 ? faStarHalf : faStarOfDavid
          }
        />
        <FontAwesomeIcon
          icon={
            rating >= 3 ? faStar : rating >= 2.5 ? faStarHalf : faStarOfDavid
          }
        />
        <FontAwesomeIcon
          icon={
            rating >= 4 ? faStar : rating >= 3.5 ? faStarHalf : faStarOfDavid
          }
        />
        <FontAwesomeIcon
          icon={
            rating >= 5 ? faStar : rating >= 4.5 ? faStarHalf : faStarOfDavid
          }
        />
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
