import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';

const RoomCard = ({ room }) => {
  return (
    <div className="room-card" id={`room-card-${room.id}`}>
      {/* Room Image */}
      <div className="room-card-image-wrap">
        <img
          src={room.image_url}
          alt={room.title}
          className="room-card-image"
          loading="lazy"
          onError={(e) => {
            // Fallback image if unsplash link fails
            e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        <div className="room-card-price-badge">
          ${parseFloat(room.price_per_night).toFixed(0)}
          <span> / night</span>
        </div>
      </div>

      {/* Room Content */}
      <div className="room-card-content">
        <h3 className="room-card-title">{room.title}</h3>
        <p className="room-card-desc">{room.description}</p>

        <div className="room-card-footer">
          <div className="room-capacity">
            <Users size={16} />
            <span>
              {room.available_rooms !== undefined
                ? `${room.available_rooms} of ${room.total_rooms} available`
                : `${room.total_rooms} available`}
            </span>
          </div>

          <Link
            to={`/rooms/${room.id}`}
            className="btn btn-outline btn-sm"
            id={`btn-view-room-${room.id}`}
          >
            <span>Book Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
