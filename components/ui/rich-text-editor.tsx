"use client"

import dynamic from "next/dynamic"

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false })
import "react-quill/dist/quill.snow.css"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
      [{ script: "sub" }, { script: "super" }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["link", "image", "video"],
      ["clean"],
    ],
  }

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "script",
    "color",
    "background",
    "align",
    "link",
    "image",
    "video",
  ]

  // Demo templates for different pages
  const templates: Record<string, string> = {
    about: `<h1>Welcome to Our Store</h1>
<p>We are passionate about providing you with the best products and exceptional service. Our journey began with a simple mission: to make quality products accessible to everyone.</p>

<h2>Our Story</h2>
<p>Founded in 2024, we started as a small team with big dreams. Over the years, we've grown into a trusted name in the industry, serving thousands of satisfied customers worldwide.</p>

<h2>Our Mission</h2>
<p>Our mission is to deliver high-quality products that exceed your expectations while providing outstanding customer service at every step of your journey with us.</p>

<h2>Why Choose Us?</h2>
<ul>
  <li><strong>Quality Products:</strong> We carefully curate every item in our collection</li>
  <li><strong>Fast Shipping:</strong> Quick and reliable delivery to your doorstep</li>
  <li><strong>Customer Support:</strong> Our team is here to help you 24/7</li>
  <li><strong>Secure Shopping:</strong> Your privacy and security are our top priorities</li>
</ul>

<h2>Contact Us</h2>
<p>Have questions? We'd love to hear from you! Reach out to us anytime, and we'll be happy to assist you.</p>`,
    privacy: `<h1>Privacy Policy</h1>
<p>Last updated: ${new Date().toLocaleDateString()}</p>

<h2>Introduction</h2>
<p>We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our store.</p>

<h2>Information We Collect</h2>
<p>We may collect the following types of information:</p>
<ul>
  <li><strong>Personal Information:</strong> Name, email address, phone number, and shipping address</li>
  <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through our payment providers)</li>
  <li><strong>Usage Data:</strong> Information about how you interact with our website</li>
  <li><strong>Device Information:</strong> IP address, browser type, and device identifiers</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
  <li>Process and fulfill your orders</li>
  <li>Communicate with you about your orders and inquiries</li>
  <li>Improve our website and services</li>
  <li>Send you marketing communications (with your consent)</li>
  <li>Comply with legal obligations</li>
</ul>

<h2>Data Security</h2>
<p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
  <li>Access your personal data</li>
  <li>Correct inaccurate data</li>
  <li>Request deletion of your data</li>
  <li>Object to processing of your data</li>
  <li>Data portability</li>
</ul>

<h2>Cookies</h2>
<p>We use cookies to enhance your browsing experience. You can control cookie preferences through your browser settings.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us through our customer support channels.</p>`,
    shipping: `<h1>Shipping Information</h1>
<p>We want to ensure your orders arrive safely and on time. Please review our shipping policies below.</p>

<h2>Shipping Methods</h2>
<p>We offer the following shipping options:</p>
<ul>
  <li><strong>Standard Shipping:</strong> 5-7 business days</li>
  <li><strong>Express Shipping:</strong> 2-3 business days</li>
  <li><strong>Overnight Shipping:</strong> Next business day (where available)</li>
</ul>

<h2>Shipping Rates</h2>
<p>Shipping costs are calculated at checkout based on:</p>
<ul>
  <li>Package weight and dimensions</li>
  <li>Shipping destination</li>
  <li>Selected shipping method</li>
</ul>
<p>Free shipping is available on orders over a certain amount. Check our current promotions for details.</p>

<h2>Processing Time</h2>
<p>Orders are typically processed within 1-2 business days. During peak seasons, processing may take 3-5 business days. You will receive a confirmation email once your order has been shipped.</p>

<h2>Shipping Destinations</h2>
<p>We currently ship to the following regions:</p>
<ul>
  <li>Domestic (all regions)</li>
  <li>International shipping available (additional charges may apply)</li>
</ul>
<p>Please note that international orders may be subject to customs duties and taxes, which are the responsibility of the recipient.</p>

<h2>Order Tracking</h2>
<p>Once your order ships, you will receive a tracking number via email. You can use this number to track your package on our website or the carrier's website.</p>

<h2>Delivery Issues</h2>
<p>If you experience any issues with delivery:</p>
<ul>
  <li>Contact us immediately with your order number</li>
  <li>We will investigate and work with the shipping carrier to resolve the issue</li>
  <li>Lost or damaged packages will be replaced or refunded at no cost to you</li>
</ul>

<h2>Contact Us</h2>
<p>For questions about shipping, please contact our customer service team. We're here to help!</p>`,
    returns: `<h1>Returns & Refunds Policy</h1>
<p>We want you to be completely satisfied with your purchase. Please review our returns and refunds policy below.</p>

<h2>Return Eligibility</h2>
<p>Items can be returned within 30 days of delivery, provided they meet the following conditions:</p>
<ul>
  <li>Items must be unused and in their original condition</li>
  <li>Original packaging and tags must be included</li>
  <li>Proof of purchase (receipt or order confirmation) is required</li>
  <li>Certain items may be non-returnable (e.g., personalized items, perishables)</li>
</ul>

<h2>How to Return</h2>
<p>To initiate a return:</p>
<ol>
  <li>Contact our customer service team with your order number</li>
  <li>We will provide you with a return authorization and shipping instructions</li>
  <li>Package the item securely in its original packaging</li>
  <li>Ship the item back using the provided return label or your preferred method</li>
</ol>

<h2>Return Shipping</h2>
<p>Return shipping costs:</p>
<ul>
  <li>If the return is due to our error or a defective item, we cover return shipping</li>
  <li>For other returns, the customer is responsible for return shipping costs</li>
  <li>We recommend using a trackable shipping method</li>
</ul>

<h2>Refund Process</h2>
<p>Once we receive and inspect your returned item:</p>
<ul>
  <li>Refunds will be processed within 5-10 business days</li>
  <li>Refunds will be issued to the original payment method</li>
  <li>You will receive an email confirmation when the refund is processed</li>
  <li>Please allow additional time for the refund to appear in your account</li>
</ul>

<h2>Exchanges</h2>
<p>We currently offer exchanges for:</p>
<ul>
  <li>Different sizes (subject to availability)</li>
  <li>Different colors (subject to availability)</li>
</ul>
<p>To request an exchange, please contact customer service with your order number and desired item.</p>

<h2>Damaged or Defective Items</h2>
<p>If you receive a damaged or defective item:</p>
<ul>
  <li>Contact us immediately with photos of the damage</li>
  <li>We will arrange for a replacement or full refund</li>
  <li>Return shipping will be covered by us</li>
</ul>

<h2>Non-Returnable Items</h2>
<p>The following items cannot be returned:</p>
<ul>
  <li>Personalized or custom-made items</li>
  <li>Perishable goods</li>
  <li>Items that have been used or damaged by the customer</li>
  <li>Items without original packaging or tags</li>
</ul>

<h2>Contact Us</h2>
<p>For questions about returns or refunds, please contact our customer service team. We're committed to resolving any issues quickly and fairly.</p>`
  }

  // Determine which template to use based on placeholder
  const getTemplate = () => {
    const placeholderLower = placeholder?.toLowerCase() || ""
    if (placeholderLower.includes("privacy")) return templates.privacy
    if (placeholderLower.includes("shipping")) return templates.shipping
    if (placeholderLower.includes("return") || placeholderLower.includes("refund")) return templates.returns
    if (placeholderLower.includes("about") || placeholderLower.includes("store")) return templates.about
    return null
  }

  // Use template if value is empty
  const displayValue = (!value || value.trim() === "" || value === "<p><br></p>" || value === "<p></p>") 
    ? (getTemplate() || value)
    : value

  return (
    <div className={className}>
      <div className="border border-border rounded-md bg-background overflow-hidden">
        <ReactQuill
          theme="snow"
          value={displayValue}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="rich-text-editor"
        />
      </div>
      <style jsx global>{`
        .rich-text-editor {
          background-color: hsl(var(--background));
        }
        .rich-text-editor .ql-container {
          min-height: 300px;
          font-size: 14px;
          border: none;
          border-top: 1px solid hsl(var(--border));
        }
        .rich-text-editor .ql-editor {
          min-height: 300px;
          padding: 16px;
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          left: 16px;
        }
        .rich-text-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid hsl(var(--border));
          background-color: hsl(var(--muted) / 0.3);
          padding: 12px 8px;
        }
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-right: 12px;
          margin-bottom: 8px;
        }
        .rich-text-editor .ql-toolbar .ql-formats:last-child {
          margin-right: 0;
        }
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground));
        }
        .rich-text-editor .ql-toolbar .ql-picker-label {
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button:focus,
        .rich-text-editor .ql-toolbar button.ql-active {
          color: hsl(var(--primary));
        }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button:focus .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: hsl(var(--primary));
        }
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button:focus .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: hsl(var(--primary));
        }
        .rich-text-editor .ql-toolbar .ql-picker.ql-expanded .ql-picker-label {
          color: hsl(var(--primary));
        }
        .rich-text-editor .ql-toolbar .ql-picker-options {
          background-color: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .rich-text-editor .ql-toolbar .ql-picker-item {
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-toolbar .ql-picker-item:hover {
          background-color: hsl(var(--muted));
          color: hsl(var(--primary));
        }
        .rich-text-editor .ql-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }
        .rich-text-editor .ql-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
        }
        .rich-text-editor .ql-editor h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
        }
        .rich-text-editor .ql-editor h4 {
          font-size: 1em;
          font-weight: bold;
          margin: 1em 0;
        }
        .rich-text-editor .ql-editor h5 {
          font-size: 0.83em;
          font-weight: bold;
          margin: 1.17em 0;
        }
        .rich-text-editor .ql-editor h6 {
          font-size: 0.67em;
          font-weight: bold;
          margin: 1.33em 0;
        }
        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 16px;
          margin: 16px 0;
          color: hsl(var(--muted-foreground));
        }
        .rich-text-editor .ql-editor code,
        .rich-text-editor .ql-editor pre {
          background-color: hsl(var(--muted));
          border-radius: 4px;
          padding: 2px 4px;
          font-family: monospace;
        }
        .rich-text-editor .ql-editor pre {
          padding: 12px;
          margin: 8px 0;
        }
        .rich-text-editor .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .rich-text-editor .ql-editor ul,
        .rich-text-editor .ql-editor ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        .rich-text-editor .ql-editor li {
          margin: 4px 0;
        }
      `}</style>
    </div>
  )
}
