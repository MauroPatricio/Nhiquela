import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { MdWifiOff } from "react-icons/md";

export const getError = (error) => {
  return error.response && error.response.data.message
    ? error.response.data.message
    : error.response.status===500?<div style={{ textAlign: 'center' }}><MdWifiOff/> Verifique a sua INTERNET</div>:error.message;
};


export const formatedDate = (dateToFormat) =>{
  const datetimeStr = dateToFormat;
const datetime = new Date(datetimeStr);

const day = datetime.getDate().toString().padStart(2, '0'); // Get the day and pad with leading 0 if needed
const month = (datetime.getMonth() + 1).toString().padStart(2, '0'); // Get the month and pad with leading 0 if needed (note that getMonth() returns a 0-based index)
const year = datetime.getFullYear();

const hours = datetime.getHours().toString().padStart(2, '0'); // Get the hours and pad with leading 0 if needed
const minutes = datetime.getMinutes().toString().padStart(2, '0'); // Get the minutes and pad with leading 0 if needed
const seconds = datetime.getSeconds().toString().padStart(2, '0'); // Get the seconds and pad with leading 0 if needed

const formattedDatetime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
return formattedDatetime; // Output: 29/04/2023 00:50:49
}
