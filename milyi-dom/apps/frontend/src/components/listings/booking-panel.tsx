'use client';

import { useState, useEffect } from 'react';
import { Listing } from '../../types/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { createBooking } from '../../services/bookings';
import { createPaymentIntent } from '../../services/payments';
import { checkAvailability } from '../../services/listings';
import toast from 'react-hot-toast';
import { nightsBetween, formatCurrency } from '../../lib/format';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

interface BookingPanelProps {
  listing: Listing;
}

interface AvailabilityResponse {
  available: boolean;
  conflictingBookings?: Array<{
    checkIn: string;
    checkOut: string;
  }>;
}

export function BookingPanel({ listing }: BookingPanelProps) {
  const { isAuthenticated } = useAuth();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const basePrice = Number(listing.basePrice || 0);
  const feeCleaning = Number(listing.cleaningFee || 0);
  const feeService = Number(listing.serviceFee || 0);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const subtotal = nights * basePrice + feeCleaning + feeService;

  // Validate availability when dates change
  useEffect(() => {
    const validateDates = async () => {
      if (!checkIn || !checkOut || nights <= 0) {
        setAvailability(null);
        return;
      }

      setCheckingAvailability(true);
      try {
        const result = await checkAvailability(listing.id, checkIn, checkOut);
        setAvailability(result);
      } catch (error) {
        console.warn('Could not check availability:', error);
        setAvailability(null);
      } finally {
        setCheckingAvailability(false);
      }
    };

    const timeoutId = setTimeout(validateDates, 500);
    return () => clearTimeout(timeoutId);
  }, [checkIn, checkOut, listing.id, nights]);

  // Validate minimum stay length
  const validateMinimumStay = () => {
    if (!checkIn || !checkOut) return true;
    const minNights = listing.minNights || 1;
    return nights >= minNights;
  };

  // Validate maximum stay length
  const validateMaximumStay = () => {
    if (!checkIn || !checkOut) return true;
    const maxNights = listing.maxNights || 365;
    return nights <= maxNights;
  };

  // Validate number of guests
  const validateGuests = () => {
    const totalGuests = adults + children;
    return totalGuests <= (listing.guests || 10) && totalGuests > 0;
  };

  const isFormValid = () => {
    return (
      checkIn &&
      checkOut &&
      nights > 0 &&
      validateMinimumStay() &&
      validateMaximumStay() &&
      validateGuests() &&
      availability?.available !== false
    );
  };

  const getValidationErrors = () => {
    const errors: string[] = [];

    if (!checkIn || !checkOut) {
      errors.push('Select check-in and check-out dates');
    } else if (nights <= 0) {
      errors.push('Check-out date must be after the check-in date');
    }

    if (!validateMinimumStay()) {
      errors.push(
        `Minimum stay: ${listing.minNights || 1} night(s). Selected: ${nights}.`,
      );
    }
    if (!validateMaximumStay()) {
      errors.push(`Maximum stay: ${listing.maxNights || 365} nights`);
    }

    if (!validateGuests()) {
      errors.push(`Maximum allowed guests: ${listing.guests || 10}`);
    }

    if (availability?.available === false) {
      errors.push('Selected dates are already booked');
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please sign in to book your stay.');
      return;
    }

    const errors = getValidationErrors();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);
    setPaymentMessage(null);
    try {
      const booking = await createBooking({
        listingId: listing.id,
        checkIn,
        checkOut,
        adults,
        children,
        infants,
        pets,
      });
      toast.success('Booking created. Waiting for host confirmation.');
      try {
        const payment = await createPaymentIntent(booking.id);
        if (payment.clientSecret) {
          setPaymentMessage('Payment is created via Stripe. Use test card credentials to complete the checkout.');
        } else if (payment.message) {
          setPaymentMessage(payment.message);
        }
      } catch (paymentError) {
        const { message } = parseError(paymentError);
        setPaymentMessage(message);
      }
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Compute minimal check-out date
  const getMinCheckOutDate = () => {
    if (!checkIn) return '';
    const minDate = new Date(checkIn);
    minDate.setDate(minDate.getDate() + (listing.minNights || 1));
    return minDate.toISOString().split('T')[0];
  };

  // Compute maximal check-out date
  const getMaxCheckOutDate = () => {
    if (!checkIn) return '';
    const maxDate = new Date(checkIn);
    maxDate.setDate(maxDate.getDate() + (listing.maxNights || 365));
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <aside className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-xl font-semibold text-slate-900">Book your stay</h2>
      <p className="mt-1 text-sm text-slate-500">Payment is captured after the host confirms the booking</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Check-in
            <Input 
              type="date" 
              value={checkIn} 
              onChange={(event) => setCheckIn(event.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Check-out
            <Input 
              type="date" 
              value={checkOut} 
              onChange={(event) => setCheckOut(event.target.value)}
              min={getMinCheckOutDate()}
              max={getMaxCheckOutDate()}
            />
          </label>
        </div>

        {/* Availability indicator */}
        {checkingAvailability && (
          <div className="text-sm text-slate-500">Checking availability...</div>
        )}
        {availability && !checkingAvailability && (
          <div className={`text-sm font-medium ${
            availability.available ? 'text-green-600' : 'text-red-600'
          }`}>
            {availability.available ? 'Dates are available' : 'Dates are unavailable'}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Adults
            <Input
              type="number"
              min={1}
              max={listing.guests}
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value))}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Children
            <Input
              type="number"
              min={0}
              max={listing.guests}
              value={children}
              onChange={(event) => setChildren(Number(event.target.value))}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Infants
            <Input
              type="number"
              min={0}
              value={infants}
              onChange={(event) => setInfants(Number(event.target.value))}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Pets
            <Input
              type="number"
              min={0}
              value={pets}
              onChange={(event) => setPets(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="rounded-2xl bg-sand-100 p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>{formatCurrency(basePrice, listing.currency)} × {(nights || 1)} night(s)</span>
            <span>{formatCurrency(nights * basePrice, listing.currency)}</span>
          </div>
          {feeCleaning > 0 && (
            <div className="flex items-center justify-between">
              <span>Cleaning fee</span>
              <span>{formatCurrency(feeCleaning, listing.currency)}</span>
            </div>
          )}
          {feeService > 0 && (
            <div className="flex items-center justify-between">
              <span>Service fee</span>
              <span>{formatCurrency(feeService, listing.currency)}</span>
            </div>
          )}
          <div className="mt-3 border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span>{formatCurrency(subtotal, listing.currency)}</span>
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          isLoading={loading}
          disabled={!isFormValid() || checkingAvailability}
        >
          {!isFormValid() ? 'Select dates' : 'Book your stay'}
        </Button>
        {paymentMessage && <p className="text-sm text-slate-500">{paymentMessage}</p>}
      </form>
    </aside>
  );
}







