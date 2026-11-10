<?php

namespace App\Http\Requests\Hotel;

class UpdateHotelRequest extends StoreHotelRequest
{
    protected bool $partial = true;
}
