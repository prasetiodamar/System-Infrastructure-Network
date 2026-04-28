<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCableRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'cable_type_id' => 'sometimes|required|exists:cable_types,id',
            'from_infrastructure_id' => 'nullable|exists:infrastructures,id',
            'to_infrastructure_id' => 'nullable|exists:infrastructures,id',
            'length' => 'nullable|numeric|min:0',
            'core_count' => 'sometimes|required|integer|min:1',
            'brand' => 'nullable|string|max:255',
            'model_type' => 'nullable|string|max:255',
            'installation_date' => 'nullable|date',
            'status' => 'sometimes|required|in:planned,installed,spliced,active,inactive,maintenance,damaged',
            'path_coordinates' => 'nullable|json',
            'notes' => 'nullable|string',
        ];
    }
}
