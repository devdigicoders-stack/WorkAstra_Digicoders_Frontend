import React, { useState, useEffect, useRef } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";

const CrudModal = ({ isOpen, onClose, title, fields = [], initialData = {}, onSubmit, loading = false, mode = "create", onFieldChange }) => {
  const [formData, setFormData] = useState({});
  const [showPassword, setShowPassword] = useState({});
  const modalRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);


  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedElement.current = document.activeElement;
    const focusable = getFocusableElements();
    focusable[0]?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab") {
        const elements = getFocusableElements();
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen, onClose]);

  const getFocusableElements = () => {
    if (!modalRef.current) return [];

    return modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (onFieldChange) {
      const updated = await onFieldChange(name, value, formData);
      setFormData(updated);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (e, name) => {
    const values = Array.from(e.target.selectedOptions, (o) => o.value);
    setFormData((prev) => ({ ...prev, [name]: values }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onMouseDown={handleOutsideClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col animate-scaleIn overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 sm:px-8 sm:py-5 border-b border-gray-100 sticky top-0 bg-gradient-to-r from-slate-50 to-white">
          <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">
            {title}
          </h2>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 min-h-[40vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : ""}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {field.label}
              </label>

              {/* SELECT */}
              {field.type === "select" ? (
                <select
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  disabled={mode === "view"}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-4 py-3 transition-all duration-200 shadow-sm hover:bg-white outline-none"
                >
                  <option value="">Select</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) :

                /* MULTISELECT */
                field.type === "multiselect" ? (
                  <select
                    multiple
                    value={formData[field.name] || []}
                    onChange={(e) => handleMultiSelect(e, field.name)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-4 py-3 transition-all duration-200 shadow-sm hover:bg-white h-28 outline-none"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) :

                  /* CHECKBOX GROUP */
                  field.type === "checkbox-group" ? (
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-4">
                      {field.groups?.map((group) => {
                        const allSelected = group.permissions.every((perm) =>
                          (formData[field.name] || []).includes(perm)
                        );

                        const toggleAll = () => {
                          let updated = [...(formData[field.name] || [])];

                          if (allSelected) {
                            updated = updated.filter(
                              (p) => !group.permissions.includes(p)
                            );
                          } else {
                            updated = [
                              ...new Set([...updated, ...group.permissions]),
                            ];
                          }

                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: updated,
                          }));
                        };

                        return (
                          <div key={group.module}>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-semibold text-gray-700">
                                {group.module}
                              </h4>

                              <button
                                type="button"
                                onClick={toggleAll}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {allSelected ? "Unselect All" : "Select All"}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {group.permissions.map((perm) => {
                                const checked =
                                  (formData[field.name] || []).includes(perm);

                                return (
                                  <label
                                    key={perm}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const updated = checked
                                          ? formData[field.name].filter(
                                            (p) => p !== perm
                                          )
                                          : [
                                            ...(formData[field.name] || []),
                                            perm,
                                          ];

                                        setFormData((prev) => ({
                                          ...prev,
                                          [field.name]: updated,
                                        }));
                                      }}
                                    />

                                    {perm
                                      .toLowerCase()
                                      .replaceAll("_", " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) :

                    /* DATE PICKER */
                    field.type === "date" ? (
                      <div className="w-full">
                        <DatePicker
                          selected={formData[field.name] ? new Date(formData[field.name]) : null}
                          onChange={(date) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: date,
                            }))
                          }
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Select date"
                          disabled={mode === "view"}
                          wrapperClassName="w-full"
                          className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-4 py-3 transition-all duration-200 shadow-sm hover:bg-white outline-none"
                        />
                      </div>
                    ) :

                      /* INPUT */
                      (
                        <div className="relative w-full">
                          <input
                            type={field.type === "password" && showPassword[field.name] ? "text" : field.type || "text"}
                            name={field.name}
                            value={formData[field.name] || ""}
                            onChange={handleChange}
                            disabled={mode === "view"}
                            className={`w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-4 py-3 transition-all duration-200 shadow-sm hover:bg-white outline-none ${field.type === "password" ? "pr-10" : ""}`}
                          />
                          {field.type === "password" && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showPassword[field.name] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          )}
                        </div>
                      )}
            </div>
          ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 sm:px-8 sm:py-5 border-t border-gray-100 sticky bottom-0 bg-slate-50/80 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white focus:ring-2 focus:ring-gray-200 transition-all shadow-sm active:scale-95 bg-gray-50"
          >
            Cancel
          </button>

          {mode !== "view" && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrudModal;