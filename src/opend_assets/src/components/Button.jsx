import React from "react";

function Button() {
    return(
    <div className="Chip-root makeStyles-chipBlue-108 Chip-clickable">
            <span
              onClick={props.handleClcik}
              className="form-Chip-label"
            >
              {props.text}
            </span>
            </div>
    )
}

export default Button;